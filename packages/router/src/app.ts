import { Elysia } from 'elysia';
import {
  DEFAULT_PAGE_SIZE,
  paginate,
  staticPaths,
  type Overview,
} from '@wca/shared';
import { cacheKey } from './cache/keys';
import { MemoryCache } from './cache/lru';
import type { RouterConfig } from './config';
import type { StaticSource } from './datasource/static-source';
import { loadOpenApiDocument } from './openapi';

export interface AppDeps {
  config: RouterConfig;
  source: StaticSource;
}

type Json = Record<string, unknown> | unknown[] | null;

function notFoundBody(resource: string, id?: string) {
  return {
    error: {
      code: 'NOT_FOUND',
      message: id ? `${resource} '${id}' not found` : `${resource} not found`,
      resource,
      id,
    },
  };
}

function badRequestBody(message: string) {
  return {
    error: {
      code: 'BAD_REQUEST',
      message,
    },
  };
}

function respondNotFound(
  set: { status?: number | string },
  resource: string,
  id?: string,
) {
  set.status = 404;
  return notFoundBody(resource, id);
}

function respondBadRequest(set: { status?: number | string }, message: string) {
  set.status = 400;
  return badRequestBody(message);
}

function asOverview<T>(value: unknown): Overview<T> | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Overview<T>;
  if (!Array.isArray(v.items)) return null;
  return {
    pagination: v.pagination ?? { page: 1, size: v.items.length || DEFAULT_PAGE_SIZE },
    total: typeof v.total === 'number' ? v.total : v.items.length,
    items: v.items,
  };
}

export function createApp(deps: AppDeps) {
  const { config, source } = deps;
  const cache = new MemoryCache<Json>({
    maxEntries: config.cacheMaxEntries,
    maxBytes: config.cacheMaxBytes,
    defaultTtlMs: config.cacheTtlMs,
    negativeTtlMs: config.cacheNegativeTtlMs,
  });

  let lastVersionDate: string | null = null;
  let lastVersionCheck = 0;

  async function loadJson(path: string): Promise<{ value: Json; cache: 'HIT' | 'MISS' }> {
    const key = cacheKey('json', path);
    const hit = cache.get(key);
    if (hit.hit) return { value: hit.value, cache: 'HIT' };
    const value = (await cache.singleflight(key, async () => {
      const v = await source.readJson(path);
      return v as Json;
    })) as Json;
    return { value, cache: 'MISS' };
  }

  async function loadRequired(path: string) {
    const { value, cache: cacheState } = await loadJson(path);
    return { value, cache: cacheState, ok: value !== null };
  }

  async function maybeInvalidateOnVersion(): Promise<void> {
    const now = Date.now();
    if (now - lastVersionCheck < config.versionPollMs) return;
    lastVersionCheck = now;
    try {
      const version = (await source.readJson(staticPaths.version())) as {
        export_date?: string;
      } | null;
      const next = version?.export_date ?? null;
      if (lastVersionDate && next && next !== lastVersionDate) {
        cache.clear();
      }
      lastVersionDate = next;
    } catch {
      // ignore poll failures
    }
  }

  const known = {
    countries: new Set<string>(),
    events: new Set<string>(),
    ready: false,
  };

  async function ensureLookups(): Promise<void> {
    if (known.ready) return;
    const countries = (await source.readJson(staticPaths.countries())) as Overview<{
      iso2Code: string;
    }> | null;
    const events = (await source.readJson(staticPaths.events())) as Overview<{ id: string }> | null;
    known.countries = new Set((countries?.items ?? []).map((c) => c.iso2Code));
    known.events = new Set((events?.items ?? []).map((e) => e.id));
    known.ready = true;
  }

  function pageFrom(query: Record<string, string | undefined>): number {
    const page = Number(query.page ?? 1);
    return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  }

  const app = new Elysia()
    .derive(({ set, request }) => {
      const origin = request.headers.get('origin');
      const allow = config.corsOrigins.includes('*')
        ? origin ?? '*'
        : origin && config.corsOrigins.includes(origin)
          ? origin
          : config.corsOrigins[0] ?? '';
      set.headers['access-control-allow-origin'] = allow;
      set.headers['access-control-allow-methods'] = 'GET,HEAD,OPTIONS';
      set.headers['access-control-allow-headers'] = 'content-type';
      return {};
    })
    .onBeforeHandle(async () => {
      await maybeInvalidateOnVersion();
    })
    .options('/*', () => new Response(null, { status: 204 }))
    .get('/health', () => ({
      status: 'ok',
      source: source.describe(),
      cache: { entries: cache.size, bytes: cache.bytes },
    }))
    .get('/openapi.json', async ({ set }) => {
      const doc = await loadOpenApiDocument();
      set.headers['content-type'] = 'application/json; charset=utf-8';
      return doc;
    })
    .get('/v1/version', async ({ set }) => {
      const { value, cache: c } = await loadRequired(staticPaths.version());
      if (!value) return respondNotFound(set,'version');
      set.headers['x-cache'] = c;
      set.headers['cache-control'] = 'public, max-age=60';
      return value;
    })
    .get('/v1/manifest', async ({ set }) => {
      const { value, cache: c } = await loadRequired(staticPaths.manifest());
      if (!value) return respondNotFound(set,'manifest');
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/continents', async ({ set }) => {
      const { value, cache: c } = await loadRequired(staticPaths.continents());
      if (!value) return respondNotFound(set,'continents');
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/countries', async ({ set }) => {
      const { value, cache: c } = await loadRequired(staticPaths.countries());
      if (!value) return respondNotFound(set,'countries');
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/events', async ({ set }) => {
      const { value, cache: c } = await loadRequired(staticPaths.events());
      if (!value) return respondNotFound(set,'events');
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/competitions', async ({ query, set }) => {
      await ensureLookups();
      const page = pageFrom(query);
      const size = Number(query.size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
      const { country, year, month, day, event } = query;

      let path = staticPaths.competitionsPage(page);
      if (country) path = staticPaths.competitionsByCountry(country.toUpperCase());
      else if (year && month && day) path = staticPaths.competitionsByDay(year, month, day);
      else if (year && month) path = staticPaths.competitionsByMonth(year, month);
      else if (year) path = staticPaths.competitionsByYear(year);
      else if (event) path = staticPaths.competitionsByEvent(event, 1);

      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(set,'competitions');
      set.headers['x-cache'] = c;

      const overview = asOverview<Record<string, unknown>>(value);
      if (!overview) return value;
      if (event || size !== DEFAULT_PAGE_SIZE || page !== 1) {
        return paginate(overview.items, page, size);
      }
      return overview;
    })
    .get('/v1/competitions/:id', async ({ params, set }) => {
      await ensureLookups();
      const kind = classify(params.id);
      if (kind === 'year') {
        const { value, cache: c } = await loadRequired(staticPaths.competitionsByYear(params.id));
        if (!value) return respondNotFound(set,'competitions', params.id);
        set.headers['x-cache'] = c;
        return value;
      }
      if (kind === 'country') {
        const { value, cache: c } = await loadRequired(
          staticPaths.competitionsByCountry(params.id.toUpperCase()),
        );
        if (!value) return respondNotFound(set,'competitions', params.id);
        set.headers['x-cache'] = c;
        return value;
      }
      if (kind === 'event') {
        const { value, cache: c } = await loadRequired(
          staticPaths.competitionsByEvent(params.id, 1),
        );
        if (!value) return respondNotFound(set,'competitions', params.id);
        set.headers['x-cache'] = c;
        return value;
      }
      const { value, cache: c } = await loadRequired(staticPaths.competitionById(params.id));
      if (!value) return respondNotFound(set,'competition', params.id);
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/championships', async ({ query, set }) => {
      const page = pageFrom(query);
      const size = Number(query.size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
      const type = query.type;
      const path = type
        ? staticPaths.championshipsByType(type)
        : staticPaths.championshipsPage(page);
      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(set,'championships');
      set.headers['x-cache'] = c;
      const overview = asOverview<Record<string, unknown>>(value);
      if (!overview || (!type && page === 1 && size === DEFAULT_PAGE_SIZE)) return value;
      return paginate(overview.items, page, size);
    })
    .get('/v1/championships/:id', async ({ params, set }) => {
      const { value, cache: c } = await loadRequired(staticPaths.championshipById(params.id));
      if (!value) return respondNotFound(set,'championship', params.id);
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/persons', async ({ query, set }) => {
      const page = pageFrom(query);
      const size = Number(query.size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
      const path = staticPaths.personsPage(page);
      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(set,'persons');
      set.headers['x-cache'] = c;
      const overview = asOverview<Record<string, unknown>>(value);
      if (!overview || (page === 1 && size === DEFAULT_PAGE_SIZE)) return value;
      return paginate(overview.items, page, size);
    })
    .get('/v1/persons/:id', async ({ params, set }) => {
      const path = config.personSharded
        ? staticPaths.personShardById(params.id)
        : staticPaths.personById(params.id);
      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(set,'person', params.id);
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/ranks/:region/:type/:eventId', async ({ params, query, set }) => {
      const type = params.type;
      if (type !== 'single' && type !== 'average') {
        return respondBadRequest(set,"type must be 'single' or 'average'");
      }
      const page = pageFrom(query);
      const size = Number(query.size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
      const path = staticPaths.rank(params.region, type, params.eventId);
      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(set,'rank', `${params.region}/${type}/${params.eventId}`);
      set.headers['x-cache'] = c;
      const overview = asOverview<Record<string, unknown>>(value);
      if (!overview || (page === 1 && size === DEFAULT_PAGE_SIZE)) return value;
      return paginate(overview.items, page, size);
    })
    .get('/v1/results/:competitionId', async ({ params, set }) => {
      const { value, cache: c } = await loadRequired(
        staticPaths.resultsByCompetition(params.competitionId),
      );
      if (!value) return respondNotFound(set,'results', params.competitionId);
      set.headers['x-cache'] = c;
      return value;
    })
    .get('/v1/results/:competitionId/:eventId', async ({ params, set }) => {
      const { value, cache: c } = await loadRequired(
        staticPaths.resultsByCompetitionEvent(params.competitionId, params.eventId),
      );
      if (!value) {
        return respondNotFound(set,'results', `${params.competitionId}/${params.eventId}`);
      }
      set.headers['x-cache'] = c;
      return value;
    })
    .onError(({ code, error, set }) => {
      if (code === 'NOT_FOUND') {
        set.status = 404;
        return {
          error: {
            code: 'NOT_FOUND',
            message: 'Resource not found',
          },
        };
      }
      set.status = 500;
      return {
        error: {
          code: 'INTERNAL',
          message: error instanceof Error ? error.message : 'Internal error',
        },
      };
    });

  function classify(id: string): 'year' | 'country' | 'event' | 'id' {
    if (/^\d{4}$/.test(id)) return 'year';
    if (known.countries.has(id.toUpperCase()) || known.countries.has(id)) return 'country';
    if (known.events.has(id)) return 'event';
    return 'id';
  }

  return app;
}


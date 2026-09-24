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
import {
  CACHE_TTL,
  respondJson,
  resourcePolicy,
  healthPolicy,
  type CachePolicy,
} from './http';
import { loadOpenApiDocument } from './openapi';

export interface AppDeps {
  config: RouterConfig;
  source: StaticSource;
}

type Json = Record<string, unknown> | unknown[] | null;

type Ctx = {
  set: { status?: number | string; headers: Record<string, string> };
  request: Request;
};

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
  ctx: Ctx,
  resource: string,
  id?: string,
  policy: CachePolicy = resourcePolicy(),
) {
  ctx.set.status = 404;
  return respondJson(ctx, {
    body: notFoundBody(resource, id),
    status: 404,
    cache: 'MISS',
    policy: { ...policy, maxAge: Math.min(policy.maxAge, 60) },
  });
}

function respondBadRequest(ctx: Ctx, message: string) {
  ctx.set.status = 400;
  return respondJson(ctx, {
    body: badRequestBody(message),
    status: 400,
    cache: 'MISS',
    policy: { maxAge: 0, noStore: true },
  });
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

  /** Serve a static JSON payload with ETag / Cache-Control / X-Cache. */
  function send(
    ctx: Ctx,
    value: Json,
    cacheState: 'HIT' | 'MISS',
    policy: CachePolicy,
  ): unknown {
    return respondJson(ctx, { body: value, cache: cacheState, policy });
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
      set.headers['access-control-allow-headers'] = 'content-type,if-none-match';
      set.headers['access-control-expose-headers'] = 'etag,x-cache,cache-control';
      set.headers['vary'] = 'origin, accept-encoding';
      return {};
    })
    .onBeforeHandle(async () => {
      await maybeInvalidateOnVersion();
    })
    .options('/*', () => new Response(null, { status: 204 }))
    .get('/health', (ctx) => {
      const body = {
        status: 'ok',
        source: source.describe(),
        cache: { entries: cache.size, bytes: cache.bytes },
      };
      return respondJson(ctx as Ctx, {
        body,
        cache: 'MISS',
        policy: healthPolicy(),
      });
    })
    .get('/openapi.json', async (ctx) => {
      const doc = await loadOpenApiDocument();
      return respondJson(ctx as Ctx, {
        body: doc,
        cache: 'MISS',
        policy: resourcePolicy(CACHE_TTL.reference),
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    })
    .get('/v1/version', async (ctx) => {
      const { value, cache: c } = await loadRequired(staticPaths.version());
      if (!value) return respondNotFound(ctx as Ctx, 'version');
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.meta));
    })
    .get('/v1/manifest', async (ctx) => {
      const { value, cache: c } = await loadRequired(staticPaths.manifest());
      if (!value) return respondNotFound(ctx as Ctx, 'manifest');
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.meta));
    })
    .get('/v1/continents', async (ctx) => {
      const { value, cache: c } = await loadRequired(staticPaths.continents());
      if (!value) return respondNotFound(ctx as Ctx, 'continents');
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.reference));
    })
    .get('/v1/countries', async (ctx) => {
      const { value, cache: c } = await loadRequired(staticPaths.countries());
      if (!value) return respondNotFound(ctx as Ctx, 'countries');
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.reference));
    })
    .get('/v1/events', async (ctx) => {
      const { value, cache: c } = await loadRequired(staticPaths.events());
      if (!value) return respondNotFound(ctx as Ctx, 'events');
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.reference));
    })
    .get('/v1/competitions', async (ctx) => {
      const { query } = ctx as unknown as {
        query: Record<string, string | undefined>;
      };
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
      if (!value) return respondNotFound(ctx as Ctx, 'competitions');

      const overview = asOverview<Record<string, unknown>>(value);
      const body: Json =
        overview && (event || size !== DEFAULT_PAGE_SIZE || page !== 1)
          ? (paginate(overview.items, page, size) as unknown as Json)
          : value;
      return send(ctx as Ctx, body, c, resourcePolicy(CACHE_TTL.resource));
    })
    .get('/v1/competitions/:id', async (ctx) => {
      const { params } = ctx as unknown as { params: { id: string } };
      await ensureLookups();
      const kind = classify(params.id);
      const policy = resourcePolicy(CACHE_TTL.resource);

      if (kind === 'year') {
        const { value, cache: c } = await loadRequired(staticPaths.competitionsByYear(params.id));
        if (!value) return respondNotFound(ctx as Ctx, 'competitions', params.id);
        return send(ctx as Ctx, value, c, policy);
      }
      if (kind === 'country') {
        const { value, cache: c } = await loadRequired(
          staticPaths.competitionsByCountry(params.id.toUpperCase()),
        );
        if (!value) return respondNotFound(ctx as Ctx, 'competitions', params.id);
        return send(ctx as Ctx, value, c, policy);
      }
      if (kind === 'event') {
        const { value, cache: c } = await loadRequired(
          staticPaths.competitionsByEvent(params.id, 1),
        );
        if (!value) return respondNotFound(ctx as Ctx, 'competitions', params.id);
        return send(ctx as Ctx, value, c, policy);
      }
      const { value, cache: c } = await loadRequired(staticPaths.competitionById(params.id));
      if (!value) return respondNotFound(ctx as Ctx, 'competition', params.id);
      return send(ctx as Ctx, value, c, policy);
    })
    .get('/v1/championships', async (ctx) => {
      const { query } = ctx as unknown as {
        query: Record<string, string | undefined>;
      };
      const page = pageFrom(query);
      const size = Number(query.size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
      const type = query.type;
      const path = type
        ? staticPaths.championshipsByType(type)
        : staticPaths.championshipsPage(page);
      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(ctx as Ctx, 'championships');
      const overview = asOverview<Record<string, unknown>>(value);
      const body: Json =
        overview && (type || page !== 1 || size !== DEFAULT_PAGE_SIZE)
          ? (paginate(overview.items, page, size) as unknown as Json)
          : value;
      return send(ctx as Ctx, body, c, resourcePolicy(CACHE_TTL.resource));
    })
    .get('/v1/championships/:id', async (ctx) => {
      const { params } = ctx as unknown as { params: { id: string } };
      const { value, cache: c } = await loadRequired(
        staticPaths.championshipById(params.id),
      );
      if (!value) return respondNotFound(ctx as Ctx, 'championship', params.id);
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.resource));
    })
    .get('/v1/persons', async (ctx) => {
      const { query } = ctx as unknown as {
        query: Record<string, string | undefined>;
      };
      const page = pageFrom(query);
      const size = Number(query.size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
      const path = staticPaths.personsPage(page);
      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(ctx as Ctx, 'persons');
      const overview = asOverview<Record<string, unknown>>(value);
      const body: Json =
        overview && (page !== 1 || size !== DEFAULT_PAGE_SIZE)
          ? (paginate(overview.items, page, size) as unknown as Json)
          : value;
      return send(ctx as Ctx, body, c, resourcePolicy(CACHE_TTL.resource));
    })
    .get('/v1/persons/:id', async (ctx) => {
      const { params } = ctx as unknown as { params: { id: string } };
      const path = config.personSharded
        ? staticPaths.personShardById(params.id)
        : staticPaths.personById(params.id);
      const { value, cache: c } = await loadRequired(path);
      if (!value) return respondNotFound(ctx as Ctx, 'person', params.id);
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.resource));
    })
    .get('/v1/ranks/:region/:type/:eventId', async (ctx) => {
      const { params, query } = ctx as unknown as {
        params: { region: string; type: string; eventId: string };
        query: Record<string, string | undefined>;
      };
      const type = params.type;
      if (type !== 'single' && type !== 'average') {
        return respondBadRequest(ctx as Ctx, "type must be 'single' or 'average'");
      }
      const page = pageFrom(query);
      const size = Number(query.size ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE;
      const path = staticPaths.rank(params.region, type, params.eventId);
      const { value, cache: c } = await loadRequired(path);
      if (!value) {
        return respondNotFound(ctx as Ctx, 'rank', `${params.region}/${type}/${params.eventId}`);
      }
      const overview = asOverview<Record<string, unknown>>(value);
      const body: Json =
        overview && (page !== 1 || size !== DEFAULT_PAGE_SIZE)
          ? (paginate(overview.items, page, size) as unknown as Json)
          : value;
      return send(ctx as Ctx, body, c, resourcePolicy(CACHE_TTL.derived));
    })
    .get('/v1/results/:competitionId', async (ctx) => {
      const { params } = ctx as unknown as { params: { competitionId: string } };
      const { value, cache: c } = await loadRequired(
        staticPaths.resultsByCompetition(params.competitionId),
      );
      if (!value) return respondNotFound(ctx as Ctx, 'results', params.competitionId);
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.resource));
    })
    .get('/v1/results/:competitionId/:eventId', async (ctx) => {
      const { params } = ctx as unknown as {
        params: { competitionId: string; eventId: string };
      };
      const { value, cache: c } = await loadRequired(
        staticPaths.resultsByCompetitionEvent(params.competitionId, params.eventId),
      );
      if (!value) {
        return respondNotFound(
          ctx as Ctx,
          'results',
          `${params.competitionId}/${params.eventId}`,
        );
      }
      return send(ctx as Ctx, value, c, resourcePolicy(CACHE_TTL.resource));
    })
    .onError(({ code, error, set, request }) => {
      const ctx = { set, request } as Ctx;
      if (code === 'NOT_FOUND') {
        return respondJson(ctx, {
          body: {
            error: {
              code: 'NOT_FOUND',
              message: 'Resource not found',
            },
          },
          status: 404,
          cache: 'MISS',
          policy: resourcePolicy(),
        });
      }
      return respondJson(ctx, {
        body: {
          error: {
            code: 'INTERNAL',
            message: error instanceof Error ? error.message : 'Internal error',
          },
        },
        status: 500,
        cache: 'MISS',
        policy: healthPolicy(),
      });
    });

  function classify(id: string): 'year' | 'country' | 'event' | 'id' {
    if (/^\d{4}$/.test(id)) return 'year';
    if (known.countries.has(id.toUpperCase()) || known.countries.has(id)) return 'country';
    if (known.events.has(id)) return 'event';
    return 'id';
  }

  return app;
}

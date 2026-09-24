import type { Context } from 'elysia';

type SetHeaders = Record<string, string>;

export interface CachePolicy {
  /** `public, max-age=…` value. */
  maxAge: number;
  /** Optional `s-max-age` for shared caches / CDNs. */
  sMaxAge?: number;
  /** When true, send `private, no-store` instead (health / errors). */
  noStore?: boolean;
}

export function etagFor(body: unknown): string {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  // FNV-1a 64-bit — fast, dependency-free, stable across processes.
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < payload.length; i++) {
    hash ^= BigInt(payload.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return `W/"${hash.toString(16).padStart(16, '0')}"`;
}

export function cacheControlFor(policy: CachePolicy): string {
  if (policy.noStore) return 'private, no-store';
  const parts = [`public, max-age=${policy.maxAge}`];
  if (policy.sMaxAge !== undefined) parts.push(`s-maxage=${policy.sMaxAge}`);
  return parts.join(', ');
}

export function ifNoneMatchHits(header: string | null | undefined, etag: string): boolean {
  if (!header) return false;
  if (header.trim() === '*') return true;
  return header
    .split(',')
    .map((part) => part.trim().replace(/^W\//, ''))
    .includes(etag.replace(/^W\//, ''));
}

export interface RespondJsonOptions {
  body: unknown;
  status?: number;
  cache: 'HIT' | 'MISS';
  policy: CachePolicy;
  headers?: SetHeaders;
}

/**
 * Apply ETag / Cache-Control / X-Cache, and honor If-None-Match with 304.
 * Call from Elysia handlers with `{ set, request }`.
 */
export function respondJson(
  ctx: { set: { status?: number | string; headers: SetHeaders }; request: Request },
  options: RespondJsonOptions,
): unknown {
  const { set, request } = ctx;
  const etag = etagFor(options.body);
  set.headers['etag'] = etag;
  set.headers['cache-control'] = cacheControlFor(options.policy);
  set.headers['x-cache'] = options.cache;
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) set.headers[k] = v;
  }

  if (ifNoneMatchHits(request.headers.get('if-none-match'), etag)) {
    set.status = 304;
    return null;
  }

  if (options.status !== undefined) set.status = options.status;
  return options.body;
}

/** Shared TTL presets (seconds). */
export const CACHE_TTL = {
  /** Hot metadata that changes with each export. */
  meta: 60,
  /** Reference lists (countries/events/…) — stable within an export. */
  reference: 300,
  /** Resource collections and details. */
  resource: 300,
  /** Derived pages / ranks. */
  derived: 120,
  /** Process health — never cache. */
  health: 0,
} as const;

export function resourcePolicy(maxAge: number = CACHE_TTL.resource): CachePolicy {
  return { maxAge, sMaxAge: Math.max(maxAge * 2, 300) };
}

export function healthPolicy(): CachePolicy {
  return { maxAge: 0, noStore: true };
}

export type HandlerCtx = Context & {
  set: { status?: number | string; headers: SetHeaders };
  request: Request;
};

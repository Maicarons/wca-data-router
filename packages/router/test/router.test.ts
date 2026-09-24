import { describe, expect, test } from 'bun:test';
import { MemoryCache } from '../src/cache/lru';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import type { StaticSource } from '../src/datasource/static-source';
import {
  cacheControlFor,
  etagFor,
  ifNoneMatchHits,
} from '../src/http';

class MapSource implements StaticSource {
  constructor(private readonly data: Map<string, unknown>) {}
  describe() {
    return 'map';
  }
  async exists(path: string) {
    return this.data.has(path);
  }
  async readJson(path: string) {
    return this.data.get(path) ?? null;
  }
}

describe('MemoryCache', () => {
  test('stores and hits', () => {
    const cache = new MemoryCache<string>({ maxEntries: 10 });
    cache.set('a', 'hello');
    const hit = cache.get('a');
    expect(hit.hit).toBe(true);
    if (hit.hit) expect(hit.value).toBe('hello');
  });

  test('ttl expiry', () => {
    let now = 0;
    const cache = new MemoryCache<string>({ now: () => now, defaultTtlMs: 100 });
    cache.set('a', 'hello');
    now = 50;
    expect(cache.get('a').hit).toBe(true);
    now = 150;
    expect(cache.get('a').hit).toBe(false);
  });

  test('negative cache', () => {
    const cache = new MemoryCache<string>();
    cache.set('missing', null);
    const hit = cache.get('missing');
    expect(hit.hit).toBe(true);
    if (hit.hit) {
      expect(hit.negative).toBe(true);
      expect(hit.value).toBeNull();
    }
  });

  test('evicts oldest beyond maxEntries', () => {
    const cache = new MemoryCache<string>({ maxEntries: 2 });
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    expect(cache.size).toBe(2);
    expect(cache.get('a').hit).toBe(false);
    expect(cache.get('c').hit).toBe(true);
  });

  test('singleflight dedupes', async () => {
    const cache = new MemoryCache<number>();
    let calls = 0;
    const load = async () => {
      calls++;
      await Bun.sleep(10);
      return 42;
    };
    const [a, b] = await Promise.all([
      cache.singleflight('k', load),
      cache.singleflight('k', load),
    ]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(calls).toBe(1);
  });
});

describe('router app', () => {
  test('serves person and 404', async () => {
    const data = new Map<string, unknown>([
      ['persons/2012TEST01.json', { id: '2012TEST01', name: 'Test' }],
      ['version.json', { export_date: '2026-09-23', export_format_version: '2.0.2' }],
    ]);
    const app = createApp({
      config: loadConfig({ CACHE_TTL_MS: '60000' }),
      source: new MapSource(data),
    });

    const ok = await app.handle(new Request('http://local/v1/persons/2012TEST01'));
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as { id: string };
    expect(body.id).toBe('2012TEST01');
    expect(ok.headers.get('x-cache')).toBe('MISS');

    const hit = await app.handle(new Request('http://local/v1/persons/2012TEST01'));
    expect(hit.headers.get('x-cache')).toBe('HIT');

    const missing = await app.handle(new Request('http://local/v1/persons/NOPE'));
    expect(missing.status).toBe(404);

    const version = await app.handle(new Request('http://local/v1/version'));
    expect(version.status).toBe(200);
  });

  test('filters competitions by query', async () => {
    const items = [
      { id: 'A', country: 'BE' },
      { id: 'B', country: 'PL' },
    ];
    const data = new Map<string, unknown>([
      [
        'competitions.json',
        {
          pagination: { page: 1, size: 1000 },
          total: 2,
          items,
        },
      ],
      [
        'competitions/BE.json',
        {
          pagination: { page: 1, size: 1 },
          total: 1,
          items: [items[0]],
        },
      ],
    ]);
    const app = createApp({
      config: loadConfig({}),
      source: new MapSource(data),
    });

    const all = await app.handle(new Request('http://local/v1/competitions'));
    expect(all.status).toBe(200);
    const allBody = (await all.json()) as { total: number };
    expect(allBody.total).toBe(2);

    const be = await app.handle(new Request('http://local/v1/competitions?country=be'));
    const beBody = (await be.json()) as { total: number; items: Array<{ id: string }> };
    expect(beBody.total).toBe(1);
    expect(beBody.items[0]?.id).toBe('A');
  });

  test('sets ETag and Cache-Control and honors If-None-Match', async () => {
    const data = new Map<string, unknown>([
      ['persons/2012TEST01.json', { id: '2012TEST01', name: 'Test' }],
      ['countries.json', { pagination: { page: 1, size: 1 }, total: 1, items: [{ iso2Code: 'BE' }] }],
      ['version.json', { export_date: '2026-09-23', export_format_version: '2.0.2' }],
      ['events.json', { pagination: { page: 1, size: 1 }, total: 1, items: [{ id: '333' }] }],
    ]);
    const app = createApp({
      config: loadConfig({}),
      source: new MapSource(data),
    });

    const res = await app.handle(new Request('http://local/v1/persons/2012TEST01'));
    expect(res.status).toBe(200);
    const etag = res.headers.get('etag');
    expect(etag).toBeTruthy();
    expect(etag).toMatch(/^W\/"[0-9a-f]+"$/);
    const cc = res.headers.get('cache-control') ?? '';
    expect(cc).toContain('public');
    expect(cc).toContain('max-age=');
    expect(res.headers.get('x-cache')).toBe('MISS');

    const cached = await app.handle(new Request('http://local/v1/persons/2012TEST01'));
    expect(cached.headers.get('x-cache')).toBe('HIT');
    expect(cached.headers.get('etag')).toBe(etag);

    const revalidated = await app.handle(
      new Request('http://local/v1/persons/2012TEST01', {
        headers: { 'if-none-match': etag as string },
      }),
    );
    expect(revalidated.status).toBe(304);
    expect(revalidated.headers.get('etag')).toBe(etag);

    const countries = await app.handle(new Request('http://local/v1/countries'));
    expect(countries.status).toBe(200);
    expect(countries.headers.get('etag')).toBeTruthy();
    expect(countries.headers.get('cache-control')).toContain('max-age=');

    const health = await app.handle(new Request('http://local/health'));
    expect(health.status).toBe(200);
    expect(health.headers.get('cache-control')).toContain('no-store');
  });

  test('etagFor is stable and if-none-match handles list and weak tags', () => {
    expect(etagFor({ a: 1 })).toBe(etagFor({ a: 1 }));
    expect(etagFor({ a: 1 })).not.toBe(etagFor({ a: 2 }));
    const tag = etagFor('x');
    expect(ifNoneMatchHits(tag, tag)).toBe(true);
    expect(ifNoneMatchHits(`W/${tag.replace(/^W\//, '')}`, tag)).toBe(true);
    expect(ifNoneMatchHits(`"nope", ${tag}`, tag)).toBe(true);
    expect(ifNoneMatchHits('*', tag)).toBe(true);
    expect(ifNoneMatchHits('"nope"', tag)).toBe(false);
    expect(ifNoneMatchHits(null, tag)).toBe(false);
    expect(cacheControlFor({ maxAge: 60 })).toBe('public, max-age=60');
    expect(cacheControlFor({ maxAge: 60, sMaxAge: 300 })).toBe('public, max-age=60, s-maxage=300');
    expect(cacheControlFor({ maxAge: 0, noStore: true })).toBe('private, no-store');
  });
});

import { describe, expect, test } from 'bun:test';
import { MemoryCache } from '../src/cache/lru';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import type { StaticSource } from '../src/datasource/static-source';

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
});

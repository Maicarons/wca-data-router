/**
 * Process-local response cache with TTL, negative entries, and request coalescing.
 */
export interface CacheEntry<T> {
  value: T | null;
  expiresAt: number;
  isNegative?: boolean;
}

export interface MemoryCacheOptions {
  maxEntries?: number;
  maxBytes?: number;
  defaultTtlMs?: number;
  negativeTtlMs?: number;
  now?: () => number;
}

export class MemoryCache<T = unknown> {
  private map = new Map<string, CacheEntry<T>>();
  private inflight = new Map<string, Promise<T | null>>();
  private approxBytes = 0;

  constructor(private readonly opts: MemoryCacheOptions = {}) {}

  private get maxEntries(): number {
    return this.opts.maxEntries ?? 512;
  }

  private get maxBytes(): number {
    return this.opts.maxBytes ?? 256 * 1024 * 1024;
  }

  private get defaultTtlMs(): number {
    return this.opts.defaultTtlMs ?? 300_000;
  }

  private get negativeTtlMs(): number {
    return this.opts.negativeTtlMs ?? 60_000;
  }

  private now(): number {
    return (this.opts.now ?? Date.now)();
  }

  get size(): number {
    return this.map.size;
  }

  get bytes(): number {
    return this.approxBytes;
  }

  get(key: string): { hit: true; value: T | null; negative: boolean } | { hit: false } {
    const entry = this.map.get(key);
    if (!entry) return { hit: false };
    if (entry.expiresAt <= this.now()) {
      this.delete(key);
      return { hit: false };
    }
    // LRU: refresh recency
    this.map.delete(key);
    this.map.set(key, entry);
    return { hit: true, value: entry.value, negative: Boolean(entry.isNegative) };
  }

  set(key: string, value: T | null, ttlMs?: number): void {
    const isNegative = value === null;
    const bytes = estimateBytes(value);
    this.delete(key);
    const expiresAt = this.now() + (ttlMs ?? (isNegative ? this.negativeTtlMs : this.defaultTtlMs));
    this.map.set(key, { value, expiresAt, isNegative });
    this.approxBytes += bytes;
    this.evict();
  }

  delete(key: string): void {
    const entry = this.map.get(key);
    if (!entry) return;
    this.approxBytes -= estimateBytes(entry.value);
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
    this.inflight.clear();
    this.approxBytes = 0;
  }

  /** Deduplicate concurrent loads for the same key. */
  async singleflight(key: string, load: () => Promise<T | null>): Promise<T | null> {
    const cached = this.get(key);
    if (cached.hit) return cached.value;

    const existing = this.inflight.get(key);
    if (existing) return existing;

    const p = (async () => {
      try {
        const value = await load();
        this.set(key, value);
        return value as T | null;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, p);
    return p;
  }

  private evict(): void {
    while (this.map.size > this.maxEntries || this.approxBytes > this.maxBytes) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      this.delete(oldest.value);
    }
  }
}

function estimateBytes(value: unknown): number {
  if (value === null || value === undefined) return 8;
  if (typeof value === 'string') return value.length * 2 + 48;
  try {
    return JSON.stringify(value).length * 2 + 64;
  } catch {
    return 256;
  }
}

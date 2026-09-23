export interface RouterConfig {
  port: number;
  staticRoot?: string;
  staticBaseUrl?: string;
  cacheMaxEntries: number;
  cacheMaxBytes: number;
  cacheTtlMs: number;
  cacheNegativeTtlMs: number;
  versionPollMs: number;
  corsOrigins: string[];
  personSharded: boolean;
}

export function loadConfig(env: Record<string, string | undefined> = process.env): RouterConfig {
  return {
    port: Number(env.PORT ?? 3000),
    staticRoot: env.STATIC_ROOT ?? undefined,
    staticBaseUrl: env.STATIC_BASE_URL ?? undefined,
    cacheMaxEntries: Number(env.CACHE_MAX_ENTRIES ?? 512),
    cacheMaxBytes: Number(env.CACHE_MAX_BYTES ?? 256 * 1024 * 1024),
    cacheTtlMs: Number(env.CACHE_TTL_MS ?? 300_000),
    cacheNegativeTtlMs: Number(env.CACHE_NEGATIVE_TTL_MS ?? 60_000),
    versionPollMs: Number(env.VERSION_POLL_MS ?? 600_000),
    corsOrigins: (env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),
    personSharded: env.PERSON_SHARDED === '1' || env.PERSON_SHARDED === 'true',
  };
}

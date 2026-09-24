# Caching

The router caches hot reads **in process** so repeated requests avoid re-reading static files. Cache is scoped to a single instance (no shared external store).

## Layers

| Layer | Behavior |
|-------|----------|
| Cache | Keyed by static path; default 512 entries / 256 MB |
| TTL | Default 300s for payloads, 60s for negative (404) entries |
| Request coalescing | Concurrent misses for the same key share one load |
| Version poll | Every 10 minutes, reads `version.json`; if `export_date` changes, the cache is cleared |

## Response headers

- `ETag` — weak FNV-1a of the response body (stable across processes)
- `If-None-Match` — returns `304 Not Modified` on match
- `X-Cache: HIT|MISS`
- `Cache-Control: public, max-age=…` (+ `s-maxage`) on JSON routes; `/health` is `private, no-store`
- `Vary: origin, accept-encoding`

## Configuration (env)

| Variable | Default | Meaning |
|----------|---------|---------|
| `CACHE_MAX_ENTRIES` | `512` | max cached entries |
| `CACHE_MAX_BYTES` | `268435456` | approx memory cap |
| `CACHE_TTL_MS` | `300000` | positive TTL |
| `CACHE_NEGATIVE_TTL_MS` | `60000` | 404 TTL |
| `VERSION_POLL_MS` | `600000` | export version poll interval |

Multi-instance deployments keep independent in-process caches and converge via TTL + version polling.

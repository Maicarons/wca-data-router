# Vercel

Two common layouts.

## A. Static only

1. Import the repo (or a deploy of the `api` branch).
2. Set **Output Directory** to `api`.
3. Serve JSON directly from the CDN.

## B. Static + router

```json
{
  "buildCommand": "bun run build:api -- --from .work/export || true",
  "outputDirectory": "api",
  "rewrites": [
    { "source": "/v1/(.*)", "destination": "/api/router.ts" }
  ]
}
```

Practical approach:

1. Attach the `api` artifacts (download in build from the `api` branch or object storage).
2. Run `@wca/router` with `STATIC_ROOT=./api` or `STATIC_BASE_URL=...`.
3. Expose `/v1/*` from the Node/Bun runtime and keep raw JSON under `/static/*` if desired.

Environment variables are the same as [Caching](/api/caching) and:

| Variable | Meaning |
|----------|---------|
| `STATIC_ROOT` | local directory of generated JSON |
| `STATIC_BASE_URL` | remote static origin (raw/jsDelivr/nginx) |
| `PERSON_SHARDED` | `true` if built with `--person-shard` |

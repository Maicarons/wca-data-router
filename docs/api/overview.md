# API overview

You can consume WCA data two ways:

1. **Static JSON files** — zero runtime, ideal for GitHub Pages / CDN.
2. **Router REST API** (`/v1/...`) — friendly paths, filters, paging, cache headers.

Both read the same generated artifacts from `api/`.

## Conventions

- Lists use `{ pagination, total, items }`
- Errors use `{ error: { code, message, ... } }`
- Router responses include `X-Cache: HIT|MISS`
- Data is **daily**, not real-time

Full machine-readable contract: [OpenAPI](/api/openapi) (`docs/openapi.yml`, or `GET /openapi.json` on the router).

## Attribution

Always keep the export attribution when redistributing derived data (see `version.json` → `attribution`).

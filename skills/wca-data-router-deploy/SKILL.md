---
name: wca-data-router-deploy
description: >-
  Deploy, build, and run the WCA Data Router monorepo (Bun + packages/builder +
  packages/router + VitePress docs). Use when the user wants to install
  dependencies, generate the static WCA JSON API, start the REST router, publish
  the api branch, deploy docs or the API, configure STATIC_ROOT / STATIC_BASE_URL
  / cache env vars, or troubleshoot builder/router/docs workflows. Triggers:
  deploy wca-data-router, 运行项目, 部署, build:api, start:router, generate static
  API, serve WCA data, run the router, publish api branch.
---

# WCA Data Router — Deploy & Run

Operate this repository end to end: install → build static API → run the REST
router → (optional) host docs / publish data.

## Project map

| Path | Role |
|------|------|
| `packages/builder` | WCA Export TSV v2 → `api/**/*.json` |
| `packages/router` | Elysia REST API + in-process response cache |
| `packages/shared` | Shared types, overview envelope, static path map |
| `docs/` | VitePress site (en at `/`, zh at `/zh/`) |
| `api/` | Generated output (gitignored locally) |
| `api` git branch | Orphan branch with published static tree |
| `.github/workflows/build-api.yml` | Daily rebuild + publish `api` branch |
| `.github/workflows/deploy-docs.yml` | Publish VitePress to GitHub Pages |
| `scripts/check-export-version.mjs` | Compare WCA `export_date` |
| `scripts/verify-static-samples.mjs` | Smoke-check sample JSON |

**Runtime:** [Bun](https://bun.sh) ≥ 1.1 (workspaces + `bun test`). Do not substitute npm/pnpm scripts blindly — root scripts are Bun-filter based.

## Prerequisites

1. Install Bun ≥ 1.1.
2. Clone the repo and install:

```bash
git clone <repo-url> wca-data-router
cd wca-data-router
bun install
```

3. Confirm toolchain:

```bash
bun --version
bun run typecheck
```

## Generate the static API

Full build downloads the latest WCA TSV export (large; can take a long time):

```bash
bun run build:api
# equivalent: bun packages/builder/src/cli.ts build
```

### Local TSV (skip download)

If a TSV extract already exists (e.g. unzipped to `.work/export/`):

```bash
bun packages/builder/src/cli.ts build --from .work/export --out api --force
```

Manual download notes:

- Do **not** treat `https://www.worldcubeassociation.org/export/results/v2/tsv` as a file URL.
- Get a versioned zip from `https://www.worldcubeassociation.org/export/results`
  or `https://exports.worldcubeassociation.org/results/...`, e.g.
  `WCA_export_v2_266_20260923T132840Z.tsv.zip`.
- Save/unzip under `.work/` and pass `--from`.

### Useful CLI flags

```text
--out <dir>          Output directory (default: ./api)
--work <dir>         Scratch directory (default: ./.work)
--from <dir>         Local extracted TSV export directory
--only <list>        Subset: continent,country,event,competition,championship,person,rank,result,version
--force              Rebuild even if version.json matches
--person-shard       persons/shard/{xx}/{id}.json layout
--tsv-url <url>      Override download URL
--connections <n>    Parallel download connections (default 4)
```

Expected output (subset):

```text
api/
  version.json
  manifest.json
  continents.json
  countries.json
  events.json
  competitions.json
  persons.json
  persons/{wcaId}.json
  rank/world/single/333.json
  results/{competitionId}.json
```

Quick smoke check:

```bash
test -f api/version.json && test -f api/manifest.json && test -f api/persons.json
```

## Run the REST router

Local static files:

```bash
STATIC_ROOT=./api bun run start:router
# or hot-reload: STATIC_ROOT=./api bun run dev:router
# or: STATIC_ROOT=./api bun packages/router/src/index.ts
```

Proxy a hosted static origin (raw GitHub / jsDelivr / nginx):

```bash
STATIC_BASE_URL=https://raw.githubusercontent.com/<owner>/<repo>/api bun run start:router
```

Health and sample reads (default `PORT=3000`):

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/persons/2012PARK03
curl "http://localhost:3000/v1/competitions?country=BE&year=2023"
curl http://localhost:3000/openapi.json
```

If built with `--person-shard`, set `PERSON_SHARDED=true` (or `1`).

## Router environment variables

| Variable | Default | Meaning |
|----------|---------|---------|
| `PORT` | `3000` | Listen port |
| `STATIC_ROOT` | — | Local directory of generated JSON |
| `STATIC_BASE_URL` | — | Remote static origin (raw/jsDelivr/nginx) |
| `PERSON_SHARDED` | `false` | `true`/`1` if built with `--person-shard` |
| `CACHE_MAX_ENTRIES` | `512` | Max cache entries |
| `CACHE_MAX_BYTES` | `268435456` | Approx memory cap |
| `CACHE_TTL_MS` | `300000` | Positive TTL |
| `CACHE_NEGATIVE_TTL_MS` | `60000` | 404 TTL |
| `VERSION_POLL_MS` | `600000` | `export_date` poll / cache clear interval |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |

Provide **either** `STATIC_ROOT` **or** `STATIC_BASE_URL` (or both; source can fall back).

## Docs site (VitePress, en + zh)

```bash
bun run docs:dev      # local preview
bun run docs:build    # write docs/.vitepress/dist
bun run docs:preview  # preview the build
```

- English: `docs/**`
- Chinese: `docs/zh/**`
- Config: `docs/.vitepress/config.ts` (`locales.root` / `locales.zh`)
- Base path: `DOCS_BASE` env (default `/wca-data-router/` for GitHub Pages project site)

## Tests and typecheck

```bash
bun test
bun run typecheck
bun run check   # typecheck + test
```

Scoped:

```bash
bun test packages/builder
bun test packages/router
```

## Deploy

### A. GitHub Actions → `api` branch (data)

Workflow `build-api.yml`:

1. Polls `https://www.worldcubeassociation.org/api/v0/export/public` for `export_date`.
2. Builds `api/**` with the Bun builder when the date changes (or on `workflow_dispatch`, which uses `--force`).
3. Publishes to orphan **`api`** branch (`peaceiris/actions-gh-pages`, `force_orphan: true`).

Manual rebuild: **Actions → Build Static API → Run workflow**.

Consume the published tree:

```text
https://raw.githubusercontent.com/<owner>/<repo>/api/persons.json
https://cdn.jsdelivr.net/gh/<owner>/<repo>@api/persons.json
```

Optional: GitHub Pages on the `api` branch
(**Settings → Pages → Deploy from branch → `api` / root**).
Prefer raw/jsDelivr/self-host for full person detail sets (very many files).

### B. GitHub Pages (docs)

Workflow `deploy-docs.yml` runs `bun run docs:build` and uploads `docs/.vitepress/dist`.
Keep `DOCS_BASE` consistent with the Pages project path (`/<repo>/`).

### C. Vercel — static only

1. Import repo (or a deploy of the `api` branch).
2. Output directory: `api`.
3. Serve JSON from the CDN.

### D. Vercel — static + router

Point rewrites `/v1/(.*)` at a Bun/Node entry that runs `@wca/router` with
`STATIC_ROOT=./api` or `STATIC_BASE_URL=...`. Keep raw JSON under `/static/*` if useful.

### E. Self-hosted (nginx + router)

```bash
rsync -a api/ /var/www/wca-api/
```

nginx sketch: `location /static/ { alias /var/www/wca-api/; }`,
`location /v1/ { proxy_pass http://127.0.0.1:3000; }`.

```bash
STATIC_ROOT=/var/www/wca-api PORT=3000 bun packages/router/src/index.ts
```

Docker sketch:

```bash
docker run --rm -p 3000:3000 \
  -e STATIC_ROOT=/data \
  -v /var/www/wca-api:/data:ro \
  oven/bun:latest \
  bun packages/router/src/index.ts
```

## Repository rules (do not break)

- **`main` holds source only** (code, workflows, docs). Generated data never lands on `main`.
- Published JSON lives on the orphan **`api`** branch.
- Static path scheme is compatible with `wca-rest-api` v1; keep it stable for consumers.
- Lists use `{ pagination, total, items }`; errors use `{ error: { code, message, ... } }`.
- Always keep export attribution when redistributing derived data
  (`version.json` → `attribution`).

## API surface (router)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | Health + cache stats |
| GET | `/openapi.json` | OpenAPI 3.0 |
| GET | `/v1/version` · `/v1/manifest` | Meta |
| GET | `/v1/continents` · `/v1/countries` · `/v1/events` | Reference |
| GET | `/v1/competitions` · `/v1/competitions/:id` | Filters: `country`, `year`, `month`, `day`, `event`, `page`, `size` |
| GET | `/v1/championships` · `/v1/championships/:id` | `?type=` |
| GET | `/v1/persons` · `/v1/persons/:id` | Summary list vs detail |
| GET | `/v1/ranks/:region/:type/:event` | Top 1000 in static payloads |
| GET | `/v1/results/:competitionId[/:eventId]` | Results |

Full contract: `docs/openapi.yml` / `docs/zh/api/openapi.md`.

## Common pitfalls

- **Export download is huge and rate-limited.** Prefer `--from` locally; keep
  `--connections` modest (default 4). HTTP 429 → builder backs off / honors `Retry-After`.
- **`export_results/v2/tsv` is not a direct file URL.** Use versioned export zips.
- **`persons.json` is summaries only.** Nested `results` live in `persons/{wcaId}.json`.
- **Cache is per-process.** Multi-instance deploys converge via TTL + version polling;
  there is no shared cache store.
- **`--person-shard` changes paths.** Set `PERSON_SHARDED` on the router to match.
- **Docs `base` must match the host path** or assets 404 on GitHub Pages.

## Deeper docs in-repo

- English: `docs/guide/*`, `docs/api/*`, `docs/deploy/*`, `docs/develop/*`
- Chinese: `docs/zh/**` (same structure)
- Design notes: `PLAN.md`
- README: `README.md` / `README_ZH.md`

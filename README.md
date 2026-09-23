# WCA Data Router

[![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

> Unofficial World Cube Association (WCA) **static JSON API** generator and **REST router** with response caching.
>
> 中文文档见 [README_ZH.md](README_ZH.md)。

## What this is

| Piece | Description |
|-------|-------------|
| `packages/builder` | Pipeline: WCA Export TSV v2 → static `api/**/*.json` |
| `packages/router` | REST API over the static data: clean paths, filters, paging, caching |
| `docs/` | VitePress documentation |
| `api` git branch | Orphan branch with generated data, ready for static hosting |

The static layout is compatible with [robiningelbrecht/wca-rest-api](https://github.com/robiningelbrecht/wca-rest-api) v1 paths.

## Why?

- WCA results refresh at most once a day — perfect for static files.
- Static JSON is cheap to host (GitHub raw / Pages / Vercel / nginx).
- A thin router adds friendly REST paths and caching when you need them.

## Quick start

```bash
bun install

# Generate static API (downloads latest export; long-running)
bun run build:api

# Serve with the router
STATIC_ROOT=./api bun run start:router

# Local docs
bun run docs:dev
```

```bash
curl http://localhost:3000/v1/persons/2012PARK03
curl "http://localhost:3000/v1/competitions?country=BE&year=2023"
```

## Repository rules

- **`main`** contains source, workflows, and docs only — enough for any CI or local machine to **build** the site and API.
- **Generated data never lands on `main`.** CI publishes `api/` to the orphan **`api` branch**, which is directly static-deployable.

## Daily updates

GitHub Actions (`.github/workflows/build-api.yml`) runs daily and on `workflow_dispatch`:

1. Reads `https://www.worldcubeassociation.org/api/v0/export/public`
2. Skips if `export_date` matches the published `version.json`
3. Otherwise builds and force-publishes the `api` branch

## Documentation

Full guides live in [`docs/`](docs/) (VitePress):

- Quick start, data model, static layout
- Router endpoints & caching
- Deploy: GitHub Pages / Vercel / self-hosted

## Data attribution

> This information is based on competition results owned and maintained by the
> World Cube Association, published at https://www.worldcubeassociation.org/export/results.

This project is **not** affiliated with the official WCA software team.

## License

Apache-2.0 — see [LICENSE](LICENSE).

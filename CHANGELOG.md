# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-09-24

First public release. Static WCA JSON API builder + REST router contract is stable for the v1-compatible path layout.

### Added

- **Builder** (`@wca/builder`): pure-Node/Bun pipeline from WCA Results Export TSV v2 to static `api/**/*.json`
  - Parallel HTTP-range download of the export zip
  - `export_date` short-circuit (skip rebuild when unchanged, `--force` to override)
  - Entities: continents, countries, events, competitions, championships, persons, ranks, results, version, manifest
  - Person list summaries (details only in `persons/{id}.json`)
  - Optional `--person-shard` layout (`persons/shard/{xx}/{id}.json`)
- **Router** (`@wca/router`): Elysia REST API over the static tree
  - Endpoints: `/health`, `/openapi.json`, `/v1/{version,manifest,continents,countries,events,competitions,championships,persons,ranks,results}`
  - In-process LRU cache with TTL, negative cache, single-flight dedupe, `export_date` fingerprint invalidation
  - Query filters and paging on collections
  - CORS, unified 400/404/500 error envelope
- **HTTP caching**: `ETag` (weak FNV-1a) + `If-None-Match` → `304`, per-route `Cache-Control` (`public, max-age` + `s-maxage`), `X-Cache: HIT|MISS`
- **Docs**: VitePress site (guides, API, deploy, develop) + OpenAPI 3
- **CI**: `ci.yml`, `build-api.yml` (daily + manual), `deploy-docs.yml`
- **Data plane publish**: generated `api/` goes only to the orphan `api` branch

### Changed

- Builder JSON writer now writes files **concurrently** (mkdir cached per directory) instead of a single serial promise chain — large speed-up on `persons/*` and `results/*`
- Builder emit pools raised (persons/results/competitions by-id) and championship details written in parallel

### Contract (v0.1.0 freeze)

- Static paths stay **compatible with wca-rest-api v1** layout
- List envelope: `{ pagination: { page, size }, total, items }`, default `size=1000`
- `solves` always length 5, zero-padded
- Router error envelope: `{ error: { code, message, resource?, id? } }`
- Response headers: `ETag`, `Cache-Control`, `X-Cache`; `If-None-Match` supported

[Unreleased]: https://github.com/Maicarons/wca-data-router/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Maicarons/wca-data-router/releases/tag/v0.1.0

# Migration from wca-rest-api

## Compatible

- Static path scheme (`persons/{id}.json`, `rank/world/single/333.json`, …)
- Overview envelope `{ pagination, total, items }`
- Entity field names and nested shapes
- Default page size `1000`
- `solves` zero-padded to length 5

## Intentional differences

| Topic | wca-rest-api v1 | This project |
|-------|-----------------|--------------|
| Build stack | PHP + MySQL import of SQL dump | Bun + streaming TSV parse |
| Person list payload | full Person objects (with nested `results`) | **summaries only** |
| Extra files | `version.json` | `version.json` + `manifest.json` |
| Serving | raw GitHub branch only | static anywhere + optional REST router |
| Rank lists | top 1000 | top 1000 (same) |

## Suggested client migration

1. Keep using raw static URLs if you already do.
2. Prefer `persons/{id}.json` for profiles instead of scanning `persons.json`.
3. Optionally switch HTTP calls to the router for query filters (`?country=&year=`) and caching headers.

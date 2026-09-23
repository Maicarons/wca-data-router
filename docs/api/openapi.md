# OpenAPI

The full API contract is published as **OpenAPI 3.0**:

- Source: [`docs/openapi.yml`](https://github.com/Maicarons/wca-data-router/blob/main/docs/openapi.yml) in this repository
- Live JSON (when the router is running): `GET /openapi.json`
- Static copy for tooling: copy `openapi.yml` from `docs/` (also under `docs/public/` after docs build)

## What is covered

| Area | Paths |
|------|--------|
| Meta | `/health`, `/openapi.json`, `/v1/version`, `/v1/manifest` |
| General | `/v1/continents`, `/v1/countries`, `/v1/events` |
| Competitions | `/v1/competitions`, `/v1/competitions/{id}` |
| Championships | `/v1/championships`, `/v1/championships/{id}` |
| Persons | `/v1/persons`, `/v1/persons/{id}` |
| Ranks | `/v1/ranks/{region}/{type}/{eventId}` |
| Results | `/v1/results/{competitionId}`, `/v1/results/{competitionId}/{eventId}` |
| Static files | `/static/**` path templates (no router required) |

Schemas include `VersionInfo`, `Manifest`, `Competition`, `Championship`, `PersonSummary`, `Person`, `Rank`, `Result`, list envelopes (`*Overview`), and `Error`.

## Use in tools

```bash
# Download from a running router
curl -fsSL http://localhost:3000/openapi.json -o openapi.json

# Or use the YAML in this repo
# docs/openapi.yml
```

Import `docs/openapi.yml` into Swagger UI, Redoc, Postman, Bruno, or an OpenAPI generator.

## Notes

- List responses always use `{ pagination, total, items }`.
- `/v1/competitions` filter priority and static-slice limits are documented on the operation.
- Rank static payloads are top **1000**; full personal ranks live on the person profile.

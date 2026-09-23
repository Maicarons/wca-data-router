# Quick start

## Prerequisites

- [Bun](https://bun.sh) ≥ 1.1

## Install

```bash
git clone <your-repo-url> wca-data-router
cd wca-data-router
bun install
```

## Build the static API

```bash
# Full build (downloads the latest TSV export)
bun run build:api

# Local TSV extract (skip download)
bun run --filter @wca/builder build -- --from .work/export --out api --force
```

### Manual download (recommended when the permalink is slow)

Do **not** use `https://www.worldcubeassociation.org/export/results/v2/tsv` as a file URL.

Get the versioned file from `https://www.worldcubeassociation.org/export/results` (or `https://exports.worldcubeassociation.org/results/...`), e.g.:

```text
https://exports.worldcubeassociation.org/results/WCA_export_v2_266_20260923T132840Z.tsv.zip
```

Save it as `F:\workspace\wca-data-router\.work\export.zip` (or unzip into `.work/export/`), then:

```bash
bun packages/builder/src/cli.ts build --from .work/export --out api --force
```

Output is written to `api/`:

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
  ...
```

## Run the router

```bash
# Point at local static files
STATIC_ROOT=./api bun run start:router

# Or proxy a hosted static origin
STATIC_BASE_URL=https://raw.githubusercontent.com/<owner>/<repo>/api bun run start:router
```

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/persons/2012PARK03
curl "http://localhost:3000/v1/competitions?country=BE&year=2023"
```

## Docs site

```bash
bun run docs:dev
```

## Tests

```bash
bun test
bun run typecheck
```

# GitHub Pages / api branch

## Data branch

CI workflow `build-api.yml`:

1. Checks `https://www.worldcubeassociation.org/api/v0/export/public` for a new `export_date`
2. Builds `api/**` with the Bun builder
3. Publishes the folder to an **orphan `api` branch** (never commits data to `main`)

That branch is a pure static tree and can be deployed as-is.

### Consume via raw

```text
https://raw.githubusercontent.com/<owner>/<repo>/api/persons.json
```

### Consume via jsDelivr

```text
https://cdn.jsdelivr.net/gh/<owner>/<repo>@api/persons.json
```

### Optional: GitHub Pages on the api branch

Repository **Settings → Pages → Deploy from branch → `api` / root**.

> Full person detail sets are large (hundreds of thousands of files). Prefer raw/jsDelivr/self-hosted for complete datasets, or build a lite subset (`--only`).

## Docs site

`deploy-docs.yml` builds VitePress from `docs/` and publishes to GitHub Pages via Actions.

## Manual dispatch

Use **Actions → Build Static API → Run workflow** to force a rebuild (`--force` is used in CI after the version check).

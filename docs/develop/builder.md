# Builder

`packages/builder` generates `api/**/*.json` from WCA Export **TSV v2**.

## Pipeline

1. `fetchExportInfo` — compare `export_date` (skips when unchanged unless `--force`)
2. Download + extract TSV zip (or `--from <dir>`)
3. Load tables into `MemoryStore` and build inverted indexes
4. Emit entity JSON with paged overviews
5. Write `version.json` + `manifest.json`

## CLI

```bash
bun packages/builder/src/cli.ts build \
  --out api \
  --work .work \
  [--from .work/export] \
  [--only continent,country,event] \
  [--person-shard] \
  [--force] \
  [--connections 4] \
  [--tsv-url https://.../export.tsv.zip]
```

## Performance notes

- Bottlenecks are usually **assembly/JSON CPU** and **small-file metadata I/O**, not disk bandwidth.
- Person emission uses a concurrency pool (`mapPool`).
- Export download uses **parallel HTTP Range chunks** (`--connections`, default **4**) with per-chunk retries. On HTTP 429 it backs off longer and honors `Retry-After`. Raise connections only if your origin allows it — the WCA export host rate-limits aggressive parallelism.
- Use `--only` during development to iterate quickly.
- Optional `--person-shard` writes `persons/shard/{xx}/{id}.json` to improve filesystem behavior on some hosts.

## Tests

```bash
bun test packages/builder
```

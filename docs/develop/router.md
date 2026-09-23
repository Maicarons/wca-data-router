# Router

`packages/router` maps REST paths onto the static tree.

## Design

- `StaticSource` abstraction: local directory, HTTP origin, or both
- Response cache with TTL, negative entries, and request coalescing
- Path resolution shared with the builder via `@wca/shared`

## Run

```bash
STATIC_ROOT=./api bun packages/router/src/index.ts
# or
STATIC_BASE_URL=https://raw.githubusercontent.com/<owner>/<repo>/api bun packages/router/src/index.ts
```

## Tests

```bash
bun test packages/router
```

## Non-goals

- No write APIs
- No authentication
- No shared/external cache service (each instance caches independently)

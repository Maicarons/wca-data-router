# Static layout

The builder emits a path scheme compatible with `wca-rest-api` v1.

```text
version.json
manifest.json
continents.json
countries.json
events.json

competitions.json
competitions-page-{n}.json
competitions/{id}.json
competitions/{ISO2}.json
competitions/{year}.json
competitions/{year}/{month}.json
competitions/{year}/{month}/{day}.json
competitions/{eventId}.json
competitions/{eventId}-page-{n}.json

championships.json
championships-page-{n}.json
championships/{id}.json
championships/{type}.json          # world | continent slug | country ISO2

persons.json
persons-page-{n}.json
persons/{wcaId}.json
# optional --person-shard
persons/shard/{xx}/{wcaId}.json

rank/{region}/{type}/{event}.json  # type: single|average; top 1000
results/{competitionId}.json
results/{competitionId}/{eventId}.json
```

## Token disambiguation

`competitions/{token}` is resolved in this order:

1. `^\d{4}$` → year collection
2. known country ISO2 → country collection
3. known event id → event collection
4. otherwise → competition id

## Deployability

The `api/` directory (and the orphan `api` git branch produced by CI) is a **pure static tree**. You can:

- enable GitHub Pages on the `api` branch
- rsync it to nginx
- import it as a Vercel static directory
- point `STATIC_BASE_URL` at raw.githubusercontent.com or jsDelivr

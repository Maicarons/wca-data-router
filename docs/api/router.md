# Router endpoints

Base URL example: `http://localhost:3000`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Process health + cache stats |
| GET | `/openapi.json` | OpenAPI document |
| GET | `/v1/version` | Export version metadata |
| GET | `/v1/manifest` | Build manifest |
| GET | `/v1/continents` | Continents |
| GET | `/v1/countries` | Countries |
| GET | `/v1/events` | Events |
| GET | `/v1/competitions` | Competitions list / filters |
| GET | `/v1/competitions/:id` | Competition, or collection for year/country/event tokens |
| GET | `/v1/championships` | Championships (`?type=`) |
| GET | `/v1/championships/:id` | Championship detail |
| GET | `/v1/persons` | Person summaries |
| GET | `/v1/persons/:id` | Person detail |
| GET | `/v1/ranks/:region/:type/:event` | Rankings |
| GET | `/v1/results/:competitionId` | Results |
| GET | `/v1/results/:competitionId/:eventId` | Results by event |

## Query parameters

### `/v1/competitions`

| Param | Example | Meaning |
|-------|---------|---------|
| `page` / `size` | `page=2&size=50` | pagination |
| `country` | `BE` | ISO2 |
| `year` | `2023` | year |
| `month` | `08` | `YYYY-MM` slice with `year` |
| `day` | `13` | full date slice |
| `event` | `333` | competitions that held the event |

### Collections

`page` and `size` work on championships, persons, ranks, and filtered competition collections.

## Examples

```bash
curl 'http://localhost:3000/v1/competitions?country=BE&year=2023'
curl 'http://localhost:3000/v1/persons/2012PARK03'
curl 'http://localhost:3000/v1/ranks/world/single/333?page=1&size=50'
curl 'http://localhost:3000/v1/results/WC2023/333'
```

## Errors

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "person '2012NOPE01' not found",
    "resource": "person",
    "id": "2012NOPE01"
  }
}
```

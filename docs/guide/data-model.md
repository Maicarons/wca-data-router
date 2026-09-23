# Data model

All list endpoints share the same envelope:

```json
{
  "pagination": { "page": 1, "size": 1000 },
  "total": 3465,
  "items": []
}
```

## Entities

| Entity | Main fields | Notes |
|--------|-------------|-------|
| Continent | `id`, `name` | `id` is a slug of the name (e.g. `europe`) |
| Country | `iso2Code`, `name` | ISO2 code |
| Event | `id`, `name`, `format` | `format`: `time` / `number` / `multi` |
| Competition | `id`, `name`, `city`, `country`, `date`, `isCanceled`, `events`, `wcaDelegates`, `organisers`, `venue`, … | |
| Championship | Competition + `region` | `region` is `world`, continent slug, or country ISO2 |
| Person (summary) | `id`, `name`, `slug`, `country`, `numberOfCompetitions`, `medals` | used in `persons.json` |
| Person (detail) | summary + `rank`, `records`, `results`, `competitionIds` | used in `persons/{id}.json` |
| Rank | `rankType`, `personId`, `eventId`, `best`, `rank.{world,continent,country}` | static files keep top 1000 |
| Result | `competitionId`, `personId`, `eventId`, `round`, `position`, `best`, `average`, `format`, `solves` | |

## Result values

Export v2 stores attempts in `result_attempts`. The API keeps the classic `solves` array of **5 integers** (zero-padded) for compatibility.

- Positive values: centiseconds (most events), move count (`multi`/`fmc`), or encoded multi-blind
- `-1`: DNF
- `-2`: DNS
- `0`: no value / padding

## Person list vs detail

To keep list payloads and file sizes manageable:

- `persons.json` / `persons-page-N.json` contain **summaries only**
- Full nested `results` live in `persons/{wcaId}.json`

This is a deliberate difference from `wca-rest-api` v1 list payloads.

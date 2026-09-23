# Static files

See [Static layout](/guide/static-layout) for the full tree.

## Examples

```bash
# Version metadata
curl https://raw.githubusercontent.com/<owner>/<repo>/api/version.json

# Person profile
curl https://raw.githubusercontent.com/<owner>/<repo>/api/persons/2012PARK03.json

# World 3x3 single ranking (top 1000)
curl https://raw.githubusercontent.com/<owner>/<repo>/api/rank/world/single/333.json

# Competition results
curl https://raw.githubusercontent.com/<owner>/<repo>/api/results/BrizZonSylwesterOpen2022.json
```

## Page files

Paged collections use `*-page-{n}.json`. Page 1 is the unsuffixed file:

- `competitions.json` == `competitions-page-1.json`
- `competitions-page-2.json` is page 2

## manifest.json

```json
{
  "generated_at": "2026-09-24T12:00:00.000Z",
  "export_date": "2026-09-23T14:05:46+00:00",
  "export_format_version": "2.0.2",
  "resources": { "persons": 200000 },
  "person_layout": "flat"
}
```

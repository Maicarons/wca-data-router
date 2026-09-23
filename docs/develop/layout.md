# Repository layout

```text
wca-data-router/
├── .github/workflows/     # ci, build-api (api branch), deploy-docs
├── docs/                  # VitePress (English)
├── packages/
│   ├── shared/            # types, overview helpers, static path map
│   ├── builder/           # TSV → static JSON generator
│   └── router/            # REST API + response cache
├── api/                   # generated output (gitignored)
├── README.md              # English
├── README_ZH.md           # Chinese
└── PLAN.md                # design / decisions
```

- `main` holds **source only** and is enough for any CI to build docs or the API.
- Generated data is published to the **`api` branch** (orphan), which is directly static-deployable.

# Introduction

**WCA Data Router** turns the [WCA Results Database Export](https://www.worldcubeassociation.org/export/results) into:

1. A **static JSON API** you can host anywhere static files work (GitHub Pages/raw, jsDelivr, Vercel, nginx).
2. An optional **REST router** that exposes friendly endpoints with response caching.

This project is inspired by [robiningelbrecht/wca-rest-api](https://github.com/robiningelbrecht/wca-rest-api) and keeps a compatible static layout so existing consumers can migrate with minimal changes.

## Why static?

- WCA results change at most once per day (after competition weekends).
- Static files are cheap to serve and easy to cache at the CDN edge.
- You can consume the data **without running any server**.

## Architecture

```text
WCA Export (TSV v2)
        │
        ▼
 packages/builder  ──►  api/**/*.json  ──►  api branch / CDN / disk
        │                      │
        │                      ▼
        │              packages/router (REST)
        │                      │
        └──────────────────────┴──► REST clients
```

## Data attribution

This information is based on competition results owned and maintained by the
World Cube Association, published at https://www.worldcubeassociation.org/export/results.

This project is **not** affiliated with the official WCA software team.

---
layout: home
hero:
  name: WCA Data Router
  text: Static WCA API + REST router
  tagline: Generate deployable JSON from the WCA Results Export. Serve it statically or through a cached REST API.
  actions:
    - theme: brand
      text: Quick start
      link: /guide/quick-start
    - theme: alt
      text: Router API
      link: /api/router
features:
  - title: Pure pipeline
    details: Stream TSV export v2, build indexes in memory, and emit static JSON — no MySQL, no PHP.
  - title: Static-first
    details: Publish the api/ folder to a dedicated branch and serve it from GitHub raw, jsDelivr, Vercel, or nginx.
  - title: REST router
    details: Friendly paths, query filters, paging, and response caching for repeated reads.
  - title: Daily refresh
    details: GitHub Actions compares the WCA export_date and rebuilds only when new data lands.
---

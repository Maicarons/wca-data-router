---
layout: home
hero:
  name: WCA Data Router
  text: 静态 WCA API + REST 路由
  tagline: 从 WCA Results Export 生成可部署的 JSON。可静态托管，也可通过带缓存的 REST API 提供服务。
  actions:
    - theme: brand
      text: 快速开始
      link: /zh/guide/quick-start
    - theme: alt
      text: Router API
      link: /zh/api/router
features:
  - title: 纯流水线
    details: 流式解析 TSV Export v2，在内存中构建索引并输出静态 JSON —— 无需 MySQL，无需 PHP。
  - title: 静态优先
    details: 将 api/ 目录发布到独立分支，可由 GitHub raw、jsDelivr、Vercel 或 nginx 直接提供服务。
  - title: REST 路由
    details: 友好路径、查询过滤、分页，以及重复读取的响应缓存。
  - title: 每日刷新
    details: GitHub Actions 对比 WCA 的 export_date，仅在有新数据时重建。
---

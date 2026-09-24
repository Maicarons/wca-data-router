# API 概览

你可以通过两种方式消费 WCA 数据：

1. **静态 JSON 文件** —— 零运行时，适合 GitHub Pages / CDN。
2. **Router REST API**（`/v1/...`）—— 友好路径、过滤、分页、缓存响应头。

两者读取的都是 `api/` 下同一套生成产物。

## 约定

- 列表使用 `{ pagination, total, items }`
- 错误使用 `{ error: { code, message, ... } }`
- Router 响应包含 `X-Cache: HIT|MISS`
- 数据为 **每日更新**，非实时

完整机器可读契约见 [OpenAPI](/zh/api/openapi)（`docs/openapi.yml`，或在路由上访问 `GET /openapi.json`）。

## 归属声明

再分发衍生数据时请始终保留导出归属声明（见 `version.json` → `attribution`）。

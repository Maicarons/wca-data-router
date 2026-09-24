# OpenAPI

完整 API 契约以 **OpenAPI 3.0** 发布：

- 源文件：本仓库中的 [`docs/openapi.yml`](https://github.com/Maicarons/wca-data-router/blob/main/docs/openapi.yml)
- 在线 JSON（路由运行时）：`GET /openapi.json`
- 供工具使用的静态副本：复制 `docs/` 下的 `openapi.yml`（文档构建后也会出现在 `docs/public/`）

## 覆盖范围

| 范围 | 路径 |
|------|------|
| 元信息 | `/health`、`/openapi.json`、`/v1/version`、`/v1/manifest` |
| 通用 | `/v1/continents`、`/v1/countries`、`/v1/events` |
| 比赛 | `/v1/competitions`、`/v1/competitions/{id}` |
| 锦标赛 | `/v1/championships`、`/v1/championships/{id}` |
| 选手 | `/v1/persons`、`/v1/persons/{id}` |
| 排名 | `/v1/ranks/{region}/{type}/{eventId}` |
| 成绩 | `/v1/results/{competitionId}`、`/v1/results/{competitionId}/{eventId}` |
| 静态文件 | `/static/**` 路径模板（无需路由） |

Schema 包括 `VersionInfo`、`Manifest`、`Competition`、`Championship`、`PersonSummary`、`Person`、`Rank`、`Result`、列表信封（`*Overview`）以及 `Error`。

## 在工具中使用

```bash
# 从运行中的路由下载
curl -fsSL http://localhost:3000/openapi.json -o openapi.json

# 或直接使用本仓库中的 YAML
# docs/openapi.yml
```

可将 `docs/openapi.yml` 导入 Swagger UI、Redoc、Postman、Bruno 或任意 OpenAPI 生成器。

## 说明

- 列表响应始终使用 `{ pagination, total, items }`。
- `/v1/competitions` 的过滤优先级与静态切片限制写在对应 operation 文档中。
- 排名静态载荷为前 **1000** 名；完整个人排名见选手主页。

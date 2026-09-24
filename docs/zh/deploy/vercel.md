# Vercel

常见有两种布局。

## A. 仅静态

1. 导入仓库（或 `api` 分支的部署）。
2. 将 **Output Directory** 设为 `api`。
3. 由 CDN 直接提供 JSON。

## B. 静态 + 路由

```json
{
  "buildCommand": "bun run build:api -- --from .work/export || true",
  "outputDirectory": "api",
  "rewrites": [
    { "source": "/v1/(.*)", "destination": "/api/router.ts" }
  ]
}
```

实际做法：

1. 附带 `api` 产物（构建时从 `api` 分支或对象存储下载）。
2. 以 `STATIC_ROOT=./api` 或 `STATIC_BASE_URL=...` 运行 `@wca/router`。
3. 由 Node/Bun 运行时暴露 `/v1/*`；如需要，可将 raw JSON 保留在 `/static/*`。

环境变量与 [缓存](/zh/api/caching) 相同，另加：

| 变量 | 含义 |
|------|------|
| `STATIC_ROOT` | 生成 JSON 的本地目录 |
| `STATIC_BASE_URL` | 远程静态源（raw/jsDelivr/nginx） |
| `PERSON_SHARDED` | 若构建时使用 `--person-shard` 则为 `true` |

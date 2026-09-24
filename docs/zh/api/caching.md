# 缓存

路由在 **进程内** 缓存热点读取，重复请求无需重新读取静态文件。缓存作用域为单实例（无共享外部存储）。

## 层次

| 层 | 行为 |
|----|------|
| Cache | 以静态路径为 key；默认 512 条 / 256 MB |
| TTL | 载荷默认 300s，负缓存（404）60s |
| 请求合并 | 同一 key 的并发 miss 共享一次加载 |
| 版本轮询 | 每 10 分钟读取 `version.json`；若 `export_date` 变化则清空缓存 |

## 响应头

- `ETag` —— 响应体的弱 FNV-1a（跨进程稳定）
- `If-None-Match` —— 匹配时返回 `304 Not Modified`
- `X-Cache: HIT|MISS`
- `Cache-Control: public, max-age=…`（+ `s-maxage`）作用于 JSON 路由；`/health` 为 `private, no-store`
- `Vary: origin, accept-encoding`

## 配置（环境变量）

| 变量 | 默认值 | 含义 |
|------|--------|------|
| `CACHE_MAX_ENTRIES` | `512` | 最大缓存条目数 |
| `CACHE_MAX_BYTES` | `268435456` | 大致内存上限 |
| `CACHE_TTL_MS` | `300000` | 正缓存 TTL |
| `CACHE_NEGATIVE_TTL_MS` | `60000` | 404 TTL |
| `VERSION_POLL_MS` | `600000` | 导出版本轮询间隔 |

多实例部署各自维护独立的进程内缓存，通过 TTL + 版本轮询最终收敛。

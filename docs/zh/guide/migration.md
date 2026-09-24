# 从 wca-rest-api 迁移

## 兼容部分

- 静态路径方案（`persons/{id}.json`、`rank/world/single/333.json` 等）
- 列表信封 `{ pagination, total, items }`
- 实体字段名与嵌套结构
- 默认分页大小 `1000`
- `solves` 补零至长度 5

## 有意差异

| 主题 | wca-rest-api v1 | 本项目 |
|------|-----------------|--------|
| 构建栈 | PHP + 导入 SQL dump 到 MySQL | Bun + 流式 TSV 解析 |
| 选手列表载荷 | 完整 Person 对象（含嵌套 `results`） | **仅摘要** |
| 额外文件 | `version.json` | `version.json` + `manifest.json` |
| 服务方式 | 仅 raw GitHub 分支 | 任意静态托管 + 可选 REST 路由 |
| 排名列表 | 前 1000 | 前 1000（相同） |

## 建议的客户端迁移步骤

1. 若你已在使用 raw 静态 URL，可继续使用。
2. 获取个人主页时优先使用 `persons/{id}.json`，而不是扫描 `persons.json`。
3. 可选：将 HTTP 调用切到路由，以使用查询过滤（`?country=&year=`）和缓存响应头。

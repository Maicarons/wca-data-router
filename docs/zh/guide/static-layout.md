# 静态目录结构

Builder 输出的路径方案与 `wca-rest-api` v1 兼容。

```text
version.json
manifest.json
continents.json
countries.json
events.json

competitions.json
competitions-page-{n}.json
competitions/{id}.json
competitions/{ISO2}.json
competitions/{year}.json
competitions/{year}/{month}.json
competitions/{year}/{month}/{day}.json
competitions/{eventId}.json
competitions/{eventId}-page-{n}.json

championships.json
championships-page-{n}.json
championships/{id}.json
championships/{type}.json          # world | continent slug | country ISO2

persons.json
persons-page-{n}.json
persons/{wcaId}.json
# 可选 --person-shard
persons/shard/{xx}/{wcaId}.json

rank/{region}/{type}/{event}.json  # type: single|average; top 1000
results/{competitionId}.json
results/{competitionId}/{eventId}.json
```

## Token 消歧

`competitions/{token}` 按以下顺序解析：

1. `^\d{4}$` → 年份集合
2. 已知国家 ISO2 → 国家集合
3. 已知项目 id → 项目集合
4. 其他 → 比赛 id

## 可部署性

`api/` 目录（以及 CI 产生的孤立 `api` git 分支）是一棵 **纯静态目录树**。你可以：

- 在 `api` 分支上启用 GitHub Pages
- 用 rsync 同步到 nginx
- 作为 Vercel 静态目录导入
- 将 `STATIC_BASE_URL` 指向 raw.githubusercontent.com 或 jsDelivr

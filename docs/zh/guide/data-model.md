# 数据模型

所有列表端点共用同一响应信封：

```json
{
  "pagination": { "page": 1, "size": 1000 },
  "total": 3465,
  "items": []
}
```

## 实体

| 实体 | 主要字段 | 说明 |
|------|----------|------|
| Continent（洲） | `id`, `name` | `id` 是名称的 slug（如 `europe`） |
| Country（国家/地区） | `iso2Code`, `name` | ISO2 代码 |
| Event（项目） | `id`, `name`, `format` | `format`：`time` / `number` / `multi` |
| Competition（比赛） | `id`, `name`, `city`, `country`, `date`, `isCanceled`, `events`, `wcaDelegates`, `organisers`, `venue` … | |
| Championship（锦标赛） | Competition + `region` | `region` 可为 `world`、洲 slug，或国家 ISO2 |
| Person（摘要） | `id`, `name`, `slug`, `country`, `numberOfCompetitions`, `medals` | 用于 `persons.json` |
| Person（详情） | 摘要 + `rank`, `records`, `results`, `competitionIds` | 用于 `persons/{id}.json` |
| Rank（排名） | `rankType`, `personId`, `eventId`, `best`, `rank.{world,continent,country}` | 静态文件保留前 1000 名 |
| Result（成绩） | `competitionId`, `personId`, `eventId`, `round`, `position`, `best`, `average`, `format`, `solves` | |

## 成绩取值

Export v2 将尝试次数存放在 `result_attempts` 中。为保持兼容，API 仍提供经典的 `solves` 数组，包含 **5 个整数**（补零）。

- 正数：百分之一秒（多数项目）、步数（`multi`/`fmc`），或编码后的多盲成绩
- `-1`：DNF
- `-2`：DNS
- `0`：无值 / 占位

## 选手列表 vs 详情

为控制列表载荷与文件体积：

- `persons.json` / `persons-page-N.json` **仅包含摘要**
- 完整嵌套的 `results` 存放在 `persons/{wcaId}.json`

这是相对 `wca-rest-api` v1 列表载荷的有意差异。

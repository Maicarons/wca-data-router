# 路由端点

Base URL 示例：`http://localhost:3000`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 进程健康状态 + 缓存统计 |
| GET | `/openapi.json` | OpenAPI 文档 |
| GET | `/v1/version` | 导出版本元数据 |
| GET | `/v1/manifest` | 构建 manifest |
| GET | `/v1/continents` | 洲列表 |
| GET | `/v1/countries` | 国家/地区列表 |
| GET | `/v1/events` | 项目列表 |
| GET | `/v1/competitions` | 比赛列表 / 过滤 |
| GET | `/v1/competitions/:id` | 比赛详情；当 token 为年份/国家/项目时返回集合 |
| GET | `/v1/championships` | 锦标赛（`?type=`） |
| GET | `/v1/championships/:id` | 锦标赛详情 |
| GET | `/v1/persons` | 选手摘要 |
| GET | `/v1/persons/:id` | 选手详情 |
| GET | `/v1/ranks/:region/:type/:event` | 排名 |
| GET | `/v1/results/:competitionId` | 比赛成绩 |
| GET | `/v1/results/:competitionId/:eventId` | 按项目查成绩 |

## 查询参数

### `/v1/competitions`

| 参数 | 示例 | 含义 |
|------|------|------|
| `page` / `size` | `page=2&size=50` | 分页 |
| `country` | `BE` | ISO2 |
| `year` | `2023` | 年份 |
| `month` | `08` | 与 `year` 组成的 `YYYY-MM` 切片 |
| `day` | `13` | 完整日期切片 |
| `event` | `333` | 举办过该项目的比赛 |

### 集合

`page` 与 `size` 对锦标赛、选手、排名，以及带过滤的比赛集合均有效。

## 示例

```bash
curl 'http://localhost:3000/v1/competitions?country=BE&year=2023'
curl 'http://localhost:3000/v1/persons/2012PARK03'
curl 'http://localhost:3000/v1/ranks/world/single/333?page=1&size=50'
curl 'http://localhost:3000/v1/results/WC2023/333'
```

## 错误

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "person '2012NOPE01' not found",
    "resource": "person",
    "id": "2012NOPE01"
  }
}
```

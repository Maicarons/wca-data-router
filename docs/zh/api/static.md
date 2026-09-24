# 静态文件

完整目录树见 [静态目录结构](/zh/guide/static-layout)。

## 示例

```bash
# 版本元数据
curl https://raw.githubusercontent.com/<owner>/<repo>/api/version.json

# 选手主页
curl https://raw.githubusercontent.com/<owner>/<repo>/api/persons/2012PARK03.json

# 三阶单次世界排名（前 1000）
curl https://raw.githubusercontent.com/<owner>/<repo>/api/rank/world/single/333.json

# 比赛成绩
curl https://raw.githubusercontent.com/<owner>/<repo>/api/results/BrizZonSylwesterOpen2022.json
```

## 分页文件

分页集合使用 `*-page-{n}.json`。第 1 页就是无后缀文件：

- `competitions.json` == `competitions-page-1.json`
- `competitions-page-2.json` 是第 2 页

## manifest.json

```json
{
  "generated_at": "2026-09-24T12:00:00.000Z",
  "export_date": "2026-09-23T14:05:46+00:00",
  "export_format_version": "2.0.2",
  "resources": { "persons": 200000 },
  "person_layout": "flat"
}
```

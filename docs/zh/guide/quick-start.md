# 快速开始

## 环境要求

- [Bun](https://bun.sh) ≥ 1.1

## 安装

```bash
git clone <your-repo-url> wca-data-router
cd wca-data-router
bun install
```

## 构建静态 API

```bash
# 完整构建（下载最新 TSV 导出）
bun run build:api

# 使用本地 TSV 解压目录（跳过下载）
bun run --filter @wca/builder build -- --from .work/export --out api --force
```

### 手动下载（permalink 较慢时推荐）

**不要** 把 `https://www.worldcubeassociation.org/export/results/v2/tsv` 当作文件 URL 使用。

请从 `https://www.worldcubeassociation.org/export/results`（或 `https://exports.worldcubeassociation.org/results/...`）获取带版本号的文件，例如：

```text
https://exports.worldcubeassociation.org/results/WCA_export_v2_266_20260923T132840Z.tsv.zip
```

保存为 `F:\workspace\wca-data-router\.work\export.zip`（或解压到 `.work/export/`），然后执行：

```bash
bun packages/builder/src/cli.ts build --from .work/export --out api --force
```

输出写入 `api/`：

```text
api/
  version.json
  manifest.json
  continents.json
  countries.json
  events.json
  competitions.json
  persons.json
  persons/{wcaId}.json
  rank/world/single/333.json
  results/{competitionId}.json
  ...
```

## 运行路由

```bash
# 指向本地静态文件
STATIC_ROOT=./api bun run start:router

# 或代理已托管的静态源
STATIC_BASE_URL=https://raw.githubusercontent.com/<owner>/<repo>/api bun run start:router
```

```bash
curl http://localhost:3000/health
curl http://localhost:3000/v1/persons/2012PARK03
curl "http://localhost:3000/v1/competitions?country=BE&year=2023"
```

## 文档站点

```bash
bun run docs:dev
```

## 测试

```bash
bun test
bun run typecheck
```

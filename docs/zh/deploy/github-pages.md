# GitHub Pages / api 分支

## 数据分支

CI 工作流 `build-api.yml`：

1. 检查 `https://www.worldcubeassociation.org/api/v0/export/public` 是否有新的 `export_date`
2. 用 Bun builder 构建 `api/**`
3. 将该目录发布到 **孤立 `api` 分支**（从不把数据提交到 `main`）

该分支是一棵纯静态目录树，可直接部署。

### 通过 raw 消费

```text
https://raw.githubusercontent.com/<owner>/<repo>/api/persons.json
```

### 通过 jsDelivr 消费

```text
https://cdn.jsdelivr.net/gh/<owner>/<repo>@api/persons.json
```

### 可选：在 api 分支上启用 GitHub Pages

仓库 **Settings → Pages → Deploy from branch → `api` / root**。

> 完整选手详情集体积很大（数十万文件）。完整数据集建议使用 raw/jsDelivr/自托管，或用 `--only` 构建精简子集。

## 文档站点

`deploy-docs.yml` 从 `docs/` 构建 VitePress，并通过 Actions 发布到 GitHub Pages。

## 手动触发

使用 **Actions → Build Static API → Run workflow** 强制重建（版本检查后 CI 会带上 `--force`）。

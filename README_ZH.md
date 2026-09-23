# WCA Data Router

[![CI](https://github.com/<owner>/<repo>/actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

> 非官方世界魔方协会（WCA）**静态 JSON API** 生成器 + **REST 路由服务**（带响应缓存）。
>
> English README: [README.md](README.md)

## 这是什么

| 组件 | 说明 |
|------|------|
| `packages/builder` | 构建流水线：WCA Export TSV v2 → 静态 `api/**/*.json` |
| `packages/router` | 面向静态数据的 REST API：友好路径、过滤、分页、缓存 |
| `docs/` | VitePress 文档（英文） |
| `api` git 分支 | CI 生成的数据孤儿分支，可直接静态部署 |

静态路径兼容 [robiningelbrecht/wca-rest-api](https://github.com/robiningelbrecht/wca-rest-api) v1。

## 为什么

- WCA 成绩最多每日更新一次，适合静态文件。
- 静态 JSON 可部署到 GitHub raw / Pages / Vercel / nginx。
- 需要友好 REST 与缓存时再加一层轻量路由服务。

## 快速开始

```bash
bun install

# 生成静态 API（下载最新 export，耗时较长）
bun run build:api

# 启动 router
STATIC_ROOT=./api bun run start:router

# 本地文档
bun run docs:dev
```

```bash
curl http://localhost:3000/v1/persons/2012PARK03
curl "http://localhost:3000/v1/competitions?country=BE&year=2023"
```

## 仓库约定

- **`main`** 只放源码、工作流、文档——任意 CI 或本机都能据此**构建**站点与 API。
- **生成的数据绝不进 `main`。** CI 将 `api/` 发布到孤儿分支 **`api`**，该分支可直接静态部署。

## 每日更新

GitHub Actions（`.github/workflows/build-api.yml`）每日及手动触发：

1. 读取 `https://www.worldcubeassociation.org/api/v0/export/public`
2. 若 `export_date` 与已发布 `version.json` 相同则跳过
3. 否则构建并强制发布 `api` 分支

## 文档

完整英文文档见 [`docs/`](docs/)（VitePress）：快速开始、数据模型、静态布局、Router 接口与缓存、三种部署手册。

## 数据声明

> 本信息基于世界魔方协会拥有并维护的比赛成绩数据，发布于
> https://www.worldcubeassociation.org/export/results。

本项目与 WCA 官方软件团队无关。

## 许可证

Apache-2.0 — 见 [LICENSE](LICENSE)。

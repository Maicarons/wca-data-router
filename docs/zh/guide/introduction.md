# 介绍

**WCA Data Router** 将 [WCA Results Database Export](https://www.worldcubeassociation.org/export/results) 转换为：

1. **静态 JSON API** —— 可托管在任何支持静态文件的地方（GitHub Pages/raw、jsDelivr、Vercel、nginx）。
2. 可选的 **REST 路由** —— 提供友好端点，并内置响应缓存。

本项目受 [robiningelbrecht/wca-rest-api](https://github.com/robiningelbrecht/wca-rest-api) 启发，并保持兼容的静态目录结构，便于现有消费方以最小改动迁移。

## 为什么选择静态？

- WCA 成绩最多每天更新一次（比赛周末结束后）。
- 静态文件托管成本低，且易于在 CDN 边缘缓存。
- **无需运行任何服务器** 即可消费数据。

## 架构

```text
WCA Export (TSV v2)
        │
        ▼
 packages/builder  ──►  api/**/*.json  ──►  api branch / CDN / disk
        │                      │
        │                      ▼
        │              packages/router (REST)
        │                      │
        └──────────────────────┴──► REST clients
```

## 数据归属声明

本信息基于 World Cube Association 所有并维护的比赛成绩数据，发布于
https://www.worldcubeassociation.org/export/results。

本项目与 WCA 官方软件团队 **无关**。

# 仓库结构

```text
wca-data-router/
├── .github/workflows/     # ci、build-api（api 分支）、deploy-docs
├── docs/                  # VitePress（中英双语）
├── packages/
│   ├── shared/            # 类型、overview 辅助、静态路径映射
│   ├── builder/           # TSV → 静态 JSON 生成器
│   └── router/            # REST API + 响应缓存
├── api/                   # 生成输出（gitignore）
├── README.md              # English
├── README_ZH.md           # 中文
└── PLAN.md                # 设计 / 决策
```

- `main` 只保存 **源码**，任意 CI 都能据此构建文档或 API。
- 生成数据发布到 **`api` 分支**（孤立分支），可直接做静态部署。

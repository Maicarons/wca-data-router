# Router

`packages/router` 将 REST 路径映射到静态目录树。

## 设计

- `StaticSource` 抽象：本地目录、HTTP 源，或两者同时
- 响应缓存：TTL、负缓存、请求合并
- 路径解析与 builder 共用，来自 `@wca/shared`

## 运行

```bash
STATIC_ROOT=./api bun packages/router/src/index.ts
# 或
STATIC_BASE_URL=https://raw.githubusercontent.com/<owner>/<repo>/api bun packages/router/src/index.ts
```

## 测试

```bash
bun test packages/router
```

## 非目标

- 不提供写入 API
- 不提供鉴权
- 不使用共享 / 外部缓存服务（各实例独立缓存）

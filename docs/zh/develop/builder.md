# Builder

`packages/builder` 从 WCA Export **TSV v2** 生成 `api/**/*.json`。

## 流水线

1. `fetchExportInfo` —— 对比 `export_date`（未变化则跳过，除非 `--force`）
2. 下载并解压 TSV zip（或使用 `--from <dir>`）
3. 将各表载入 `MemoryStore` 并构建倒排索引
4. 输出实体 JSON，并生成分页 overview
5. 写入 `version.json` + `manifest.json`

## CLI

```bash
bun packages/builder/src/cli.ts build \
  --out api \
  --work .work \
  [--from .work/export] \
  [--only continent,country,event] \
  [--person-shard] \
  [--force] \
  [--connections 4] \
  [--tsv-url https://.../export.tsv.zip]
```

## 性能说明

- 瓶颈通常是 **组装 / JSON CPU** 与 **小文件元数据 I/O**，而不是磁盘带宽。
- 选手输出使用并发池（`mapPool`）。
- 导出下载使用 **并行 HTTP Range 分片**（`--connections`，默认 **4**）并按分片重试。遇到 HTTP 429 会拉长退避并遵守 `Retry-After`。仅在源站允许时再调高连接数 —— WCA 导出主机会对激进的并行限流。
- 开发时可用 `--only` 快速迭代。
- 可选 `--person-shard` 会写出 `persons/shard/{xx}/{id}.json`，改善某些主机上的文件系统表现。

## 测试

```bash
bun test packages/builder
```

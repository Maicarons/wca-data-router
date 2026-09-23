#!/usr/bin/env bun
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { buildApi } from './pipeline';

function printHelp(): void {
  console.log(`wca-build — generate static WCA JSON API

Usage:
  bun src/cli.ts build [options]

Options:
  --out <dir>          Output directory (default: ./api)
  --work <dir>         Scratch directory (default: ./.work)
  --from <dir>         Use a local extracted TSV export directory
  --only <list>        Comma-separated entities to rebuild
                       continent,country,event,competition,championship,person,rank,result,version
  --force              Ignore existing version.json short-circuit
  --person-shard       Write person details under persons/shard/{xx}/{id}.json
  --tsv-url <url>      Override TSV download URL
  --connections <n>    Parallel download connections (default 4; WCA origin rate-limits aggressive parallelism)
  -h, --help           Show help
`);
}

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  options: {
    out: { type: 'string' },
    work: { type: 'string' },
    from: { type: 'string' },
    only: { type: 'string' },
    force: { type: 'boolean' },
    'person-shard': { type: 'boolean' },
    'tsv-url': { type: 'string' },
    connections: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help || positionals[0] !== 'build') {
  printHelp();
  process.exit(values.help ? 0 : 1);
}

const outDir = resolve(values.out ?? 'api');
const workDir = resolve(values.work ?? '.work');

const result = await buildApi({
  outDir,
  workDir,
  fromLocal: values.from ? resolve(values.from) : undefined,
  force: Boolean(values.force),
  only: values.only ? values.only.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
  personSharded: Boolean(values['person-shard']),
  tsvUrl: values['tsv-url'],
  downloadConnections: values.connections ? Number(values.connections) : undefined,
  log: (m) => console.log(m),
});

if (result.skipped) {
  process.exit(0);
}

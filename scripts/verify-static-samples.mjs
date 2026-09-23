#!/usr/bin/env bun
/**
 * Smoke-check generated static API samples.
 * Usage: bun scripts/verify-static-samples.mjs [outDir]
 */
const outDir = Bun.argv[2] ?? 'api';
const required = ['version.json', 'manifest.json', 'continents.json', 'countries.json', 'events.json'];

for (const rel of required) {
  const file = Bun.file(`${outDir}/${rel}`);
  if (!(await file.exists())) {
    console.error(`missing ${rel}`);
    process.exit(1);
  }
  const json = await file.json();
  if (typeof json !== 'object') {
    console.error(`invalid json ${rel}`);
    process.exit(1);
  }
}

const version = await Bun.file(`${outDir}/version.json`).json();
const manifest = await Bun.file(`${outDir}/manifest.json`).json();
if (!version.export_date) {
  console.error('version.json missing export_date');
  process.exit(1);
}
console.log(`OK ${outDir} export_date=${version.export_date} resources=${JSON.stringify(manifest.resources ?? {})}`);

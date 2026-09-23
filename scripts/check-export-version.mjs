#!/usr/bin/env bun
/**
 * Print WCA export/public metadata and whether it differs from a local version.json.
 * Usage: bun scripts/check-export-version.mjs [path/to/version.json]
 */
const versionPath = Bun.argv[2] ?? 'api/version.json';
const res = await fetch('https://www.worldcubeassociation.org/api/v0/export/public');
if (!res.ok) {
  console.error(`export/public failed: ${res.status}`);
  process.exit(1);
}
const raw = await res.json();
const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
const nextDate = payload.export_date ?? payload.exportDate ?? '';

let currentDate = '';
const file = Bun.file(versionPath);
if (await file.exists()) {
  try {
    const current = await file.json();
    currentDate = current.export_date ?? '';
  } catch {
    currentDate = '';
  }
}

console.log(JSON.stringify({
  next_export_date: nextDate,
  current_export_date: currentDate,
  changed: Boolean(nextDate) && nextDate !== currentDate,
  tsv_url: payload.tsv_url ?? null,
  sql_url: payload.sql_url ?? null,
}, null, 2));

if (nextDate && currentDate && nextDate === currentDate) {
  process.exit(0);
}
// non-zero can be used as "needs rebuild" signal if desired; keep 0 for piping
process.exit(0);

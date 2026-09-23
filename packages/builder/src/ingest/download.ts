import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { EXPORT_PUBLIC_URL, parseExportPublicPayload } from '@wca/shared';
import { downloadFileParallel } from './parallel-download';

export interface ExportInfo {
  export_date: string;
  export_format_version: string;
  sql_url?: string;
  tsv_url?: string;
}

export async function fetchExportInfo(url = EXPORT_PUBLIC_URL): Promise<ExportInfo> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch export info: ${res.status} ${res.statusText}`);
  }
  const raw = await res.json();
  // API may return a JSON string body or object
  const payload = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const parsed = parseExportPublicPayload(payload);
  if (!parsed) {
    throw new Error(`Unexpected export/public payload: ${JSON.stringify(payload).slice(0, 200)}`);
  }
  return parsed;
}

export async function downloadFile(
  url: string,
  dest: string,
  opts?: { connections?: number; log?: (msg: string) => void; force?: boolean },
): Promise<void> {
  await downloadFileParallel({
    url,
    dest,
    connections: opts?.connections,
    force: opts?.force,
    log: opts?.log,
  });
}

export async function extractZip(zipPath: string, destDir: string): Promise<void> {
  await rm(destDir, { recursive: true, force: true });
  await mkdir(destDir, { recursive: true });

  const tryCommands: string[][] = [
    ['unzip', '-o', zipPath, '-d', destDir],
    ['tar', '-xf', zipPath, '-C', destDir],
  ];

  if (process.platform === 'win32') {
    tryCommands.unshift([
      'powershell',
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`,
    ]);
  }

  let lastError = '';
  for (const cmd of tryCommands) {
    const proc = Bun.spawn(cmd, { stdout: 'pipe', stderr: 'pipe' });
    const code = await proc.exited;
    if (code === 0) return;
    lastError = await new Response(proc.stderr).text();
  }
  throw new Error(`Failed to extract ${zipPath}: ${lastError}`);
}

export function findTsvFile(dir: string, files: string[]): string | null {
  const tsvs = files.filter((f) => f.toLowerCase().endsWith('.tsv'));
  // Prefer results table as marker that extraction worked
  const preferred = tsvs.find((f) => /results\.tsv$/i.test(f));
  return preferred ?? tsvs[0] ?? null;
}

export async function listTsvFiles(dir: string): Promise<string[]> {
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.tsv'))
    .map((e) => join(e.parentPath ?? e.path ?? dir, e.name));
}

export async function loadLocalExport(exportDir: string): Promise<{
  tables: Map<string, string>;
  exportDate: string;
  exportFormatVersion: string;
}> {
  const files = await listTsvFiles(exportDir);
  const tables = new Map<string, string>();
  for (const file of files) {
    const base = file.split(/[\\/]/).pop() ?? '';
    const name = base.replace(/\.tsv$/i, '').toLowerCase();
    // WCA_export_continents.tsv -> continents
    const cleaned = name.replace(/^wca_export_/, '').replace(/^wca_exports_/, '');
    tables.set(cleaned, file);
  }

  let exportDate = new Date().toISOString();
  let exportFormatVersion = '2.0.0';
  const metaPath = join(exportDir, 'metadata.json');
  const metaFile = Bun.file(metaPath);
  if (await metaFile.exists()) {
    try {
      const meta = await metaFile.json();
      if (meta.export_date) exportDate = String(meta.export_date);
      if (meta.export_format_version) exportFormatVersion = String(meta.export_format_version);
    } catch {
      // ignore malformed metadata
    }
  }

  return { tables, exportDate, exportFormatVersion };
}

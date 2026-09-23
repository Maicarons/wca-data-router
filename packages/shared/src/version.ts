import type { VersionInfo } from './types';

export const DATA_ATTRIBUTION =
  'This information is based on competition results owned and maintained by the World Cube Association, published at https://www.worldcubeassociation.org/export/results.';

export const EXPORT_PUBLIC_URL = 'https://www.worldcubeassociation.org/api/v0/export/public';

export function parseExportPublicPayload(raw: unknown): {
  export_date: string;
  export_format_version: string;
  sql_url?: string;
  tsv_url?: string;
  tsv_filesize_bytes?: number;
  sql_filesize_bytes?: number;
} | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const exportDate = obj.export_date ?? obj.exportDate;
  const formatVersion =
    obj.export_format_version ?? obj.export_version ?? obj.export_format ?? '2.0.0';
  if (typeof exportDate !== 'string' || !exportDate) return null;
  return {
    export_date: exportDate,
    export_format_version: String(formatVersion),
    sql_url: typeof obj.sql_url === 'string' ? obj.sql_url : undefined,
    tsv_url: typeof obj.tsv_url === 'string' ? obj.tsv_url : undefined,
    tsv_filesize_bytes:
      typeof obj.tsv_filesize_bytes === 'number' ? obj.tsv_filesize_bytes : undefined,
    sql_filesize_bytes:
      typeof obj.sql_filesize_bytes === 'number' ? obj.sql_filesize_bytes : undefined,
  };
}

/** Permalink style URLs should be resolved to the versioned exports CDN file. */
export function isConcreteExportFileUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /exports\.worldcubeassociation\.org\//i.test(url) || /\.zip(\?|$)/i.test(url);
}

export function buildVersionInfo(
  exportInfo: {
    export_date: string;
    export_format_version: string;
    sql_url?: string;
    tsv_url?: string;
  },
  generatedAt = new Date().toISOString(),
): VersionInfo {
  return {
    export_date: exportInfo.export_date,
    export_format_version: exportInfo.export_format_version,
    sql_url: exportInfo.sql_url,
    tsv_url: exportInfo.tsv_url,
    generated_at: generatedAt,
    attribution: DATA_ATTRIBUTION,
  };
}

export function isNewerExport(current: VersionInfo | null, nextExportDate: string): boolean {
  if (!current?.export_date) return true;
  return current.export_date !== nextExportDate;
}

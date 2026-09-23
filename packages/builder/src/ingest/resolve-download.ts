/**
 * Resolve a concrete (non-permalink) WCA export download URL.
 * Permalinks like https://www.worldcubeassociation.org/export/results/v2/tsv
 * are not stable download endpoints — prefer exports.worldcubeassociation.org files.
 */
import { isConcreteExportFileUrl } from '@wca/shared';

export const EXPORT_PAGE_URL = 'https://www.worldcubeassociation.org/export/results';

export interface ResolvedExportUrls {
  tsvUrl: string;
  sqlUrl?: string;
  source: 'api' | 'redirect' | 'page';
}

export async function resolveExportDownloadUrls(opts: {
  tsvUrl?: string;
  sqlUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<ResolvedExportUrls> {
  const doFetch = opts.fetchImpl ?? fetch;

  if (isConcreteExportFileUrl(opts.tsvUrl)) {
    return { tsvUrl: opts.tsvUrl!, sqlUrl: opts.sqlUrl, source: 'api' };
  }

  // 1) Follow redirects from permalink to the real file URL
  if (opts.tsvUrl) {
    const redirected = await resolveRedirect(opts.tsvUrl, doFetch);
    if (redirected && isConcreteExportFileUrl(redirected)) {
      return { tsvUrl: redirected, sqlUrl: opts.sqlUrl, source: 'redirect' };
    }
  }

  // 2) Parse the public export page for WCA_export_v2_*.tsv.zip
  const fromPage = await parseExportPage(doFetch);
  if (fromPage?.tsvUrl) {
    return {
      tsvUrl: fromPage.tsvUrl,
      sqlUrl: fromPage.sqlUrl ?? opts.sqlUrl,
      source: 'page',
    };
  }

  if (!opts.tsvUrl) {
    throw new Error('Unable to resolve WCA TSV download URL');
  }
  return { tsvUrl: opts.tsvUrl, sqlUrl: opts.sqlUrl, source: 'api' };
}

async function resolveRedirect(url: string, doFetch: typeof fetch): Promise<string | null> {
  try {
    const res = await doFetch(url, { method: 'HEAD', redirect: 'follow' });
    if (res.url && isConcreteExportFileUrl(res.url)) return res.url;
    // Some stacks expose the final URL only on GET
    const get = await doFetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { Range: 'bytes=0-0' },
    });
    if (get.url && isConcreteExportFileUrl(get.url)) return get.url;
    return null;
  } catch {
    return null;
  }
}

export async function parseExportPage(
  doFetch: typeof fetch = fetch,
): Promise<{ tsvUrl?: string; sqlUrl?: string } | null> {
  try {
    const res = await doFetch(EXPORT_PAGE_URL);
    if (!res.ok) return null;
    const html = await res.text();
    const tsv = html.match(
      /https:\/\/exports\.worldcubeassociation\.org\/results\/WCA_export_v2_[A-Za-z0-9_]+\.tsv\.zip/,
    )?.[0];
    const sql = html.match(
      /https:\/\/exports\.worldcubeassociation\.org\/results\/WCA_export_v2_[A-Za-z0-9_]+\.sql\.zip/,
    )?.[0];
    if (!tsv && !sql) return null;
    return { tsvUrl: tsv, sqlUrl: sql };
  } catch {
    return null;
  }
}

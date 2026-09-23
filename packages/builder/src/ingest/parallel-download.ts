/**
 * Parallel chunked downloader using HTTP Range requests.
 * Falls back to a single stream when the server does not support ranges.
 */

export interface DownloadOptions {
  url: string;
  dest: string;
  /** Parallel connections (default 8). */
  connections?: number;
  /** Chunk size in bytes (default 4 MiB). */
  chunkSize?: number;
  /** Overwrite existing complete file. */
  force?: boolean;
  log?: (msg: string) => void;
  /** Abort after this many retries per chunk. */
  maxRetries?: number;
}

export interface DownloadResult {
  bytes: number;
  connections: number;
  mode: 'range' | 'stream';
  ms: number;
}

const DEFAULT_CONNECTIONS = 4;
const DEFAULT_CHUNK = 4 * 1024 * 1024;

export async function downloadFileParallel(options: DownloadOptions): Promise<DownloadResult> {
  const started = Date.now();
  const log = options.log ?? (() => {});
  const dest = options.dest;
  const { mkdir } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(dest), { recursive: true });

  const head = await probe(options.url);
  if (!head.ok) {
    throw new Error(`Download probe failed ${options.url}: ${head.status}`);
  }

  const fileSize = head.length;
  const acceptRanges = head.acceptRanges;

  // Resume: if dest already has full size, skip
  const existing = await fileSizeOnDisk(dest);
  if (!options.force && fileSize > 0 && existing === fileSize) {
    log(`Already complete: ${dest} (${fileSize} bytes)`);
    return { bytes: fileSize, connections: 0, mode: 'stream', ms: Date.now() - started };
  }

  const connections = Math.max(1, options.connections ?? DEFAULT_CONNECTIONS);
  const chunkSize = Math.max(64 * 1024, options.chunkSize ?? DEFAULT_CHUNK);
  const ranges = planRanges(fileSize, chunkSize);

  if (!acceptRanges || fileSize <= 0 || ranges.length < 2) {
    log(`Single-stream download (${fileSize || 'unknown'} bytes)…`);
    const bytes = await downloadSingle(options.url, dest, options.maxRetries ?? 3);
    return { bytes, connections: 1, mode: 'stream', ms: Date.now() - started };
  }

  const workers = Math.min(connections, ranges.length);

  log(
    `Parallel download: ${fileSize} bytes, ${ranges.length} chunks, ${workers} connections…`,
  );

  // Open sparse-capable file handle and write chunks at offsets
  const { open } = await import('node:fs/promises');
  const handle = await open(dest, 'w+');
  try {
    // Pre-size the file
    await handle.truncate(fileSize);

    let next = 0;
    let doneBytes = 0;
    const failures: string[] = [];

    const runWorker = async () => {
      while (next < ranges.length) {
        const index = next++;
        const range = ranges[index]!;
        let attempt = 0;
        const maxRetries = options.maxRetries ?? 8;
        for (;;) {
          try {
            const buf = await fetchRange(options.url, range.start, range.end);
            if (buf.byteLength !== range.end - range.start + 1) {
              throw new Error(
                `chunk ${index}: got ${buf.byteLength}, expected ${range.end - range.start + 1}`,
              );
            }
            await handle.write(buf, 0, buf.byteLength, range.start);
            doneBytes += buf.byteLength;
            if (doneBytes % (16 * 1024 * 1024) < buf.byteLength) {
              const pct = ((doneBytes / fileSize) * 100).toFixed(1);
              log(`  progress ${pct}% (${doneBytes}/${fileSize})`);
            }
            break;
          } catch (err) {
            attempt++;
            const msg = (err as Error).message;
            const isRateLimit = /HTTP 429/.test(msg);
            if (attempt > maxRetries) {
              failures.push(`chunk ${index}: ${msg}`);
              break;
            }
            // 429: longer backoff so the origin can recover
            const base = isRateLimit ? 1500 : 200;
            await Bun.sleep(base * attempt);
          }
        }
      }
    };

    await Promise.all(Array.from({ length: workers }, () => runWorker()));

    if (failures.length) {
      throw new Error(`Download failed:\n${failures.join('\n')}`);
    }
  } finally {
    await handle.close();
  }

  const finalSize = await fileSizeOnDisk(dest);
  if (finalSize !== fileSize) {
    throw new Error(`Incomplete download: ${finalSize} != ${fileSize}`);
  }

  return {
    bytes: fileSize,
    connections: workers,
    mode: 'range',
    ms: Date.now() - started,
  };
}

function planRanges(
  fileSize: number,
  chunkSize: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < fileSize; start += chunkSize) {
    const end = Math.min(fileSize - 1, start + chunkSize - 1);
    ranges.push({ start, end });
  }
  return ranges;
}

async function probe(
  url: string,
): Promise<{ ok: boolean; status: number; length: number; acceptRanges: boolean }> {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await probeOnce(url);
    if (result.ok) return result;
    if (result.status !== 429 && result.status !== 503 && result.status !== 0) {
      return result;
    }
    if (attempt === maxAttempts) return result;
    await Bun.sleep(1000 * attempt);
  }
  return { ok: false, status: 0, length: 0, acceptRanges: false };
}

async function probeOnce(
  url: string,
): Promise<{ ok: boolean; status: number; length: number; acceptRanges: boolean }> {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.status === 429) {
      return { ok: false, status: 429, length: 0, acceptRanges: false };
    }
    const length = Number(res.headers.get('content-length') ?? '0') || 0;
    const accept = (res.headers.get('accept-ranges') ?? '').toLowerCase();
    return {
      ok: res.ok,
      status: res.status,
      length,
      acceptRanges: accept.includes('bytes'),
    };
  } catch {
    // Some CDNs reject HEAD; try a 1-byte range probe
    try {
      const res = await fetch(url, {
        headers: { Range: 'bytes=0-0' },
      });
      if (res.status === 429) {
        return { ok: false, status: 429, length: 0, acceptRanges: false };
      }
      const contentRange = res.headers.get('content-range') ?? '';
      const total = Number(contentRange.split('/')[1] ?? '0') || 0;
      return {
        ok: res.ok || res.status === 206,
        status: res.status,
        length: total,
        acceptRanges: res.status === 206 || total > 0,
      };
    } catch {
      return { ok: false, status: 0, length: 0, acceptRanges: false };
    }
  }
}

async function fetchRange(url: string, start: number, end: number): Promise<Uint8Array> {
  const res = await fetch(url, {
    headers: { Range: `bytes=${start}-${end}` },
  });
  if (res.status === 429) {
    const retryAfter = Number(res.headers.get('retry-after') ?? '0');
    if (retryAfter > 0) await Bun.sleep(retryAfter * 1000);
    throw new Error(`range ${start}-${end}: HTTP 429`);
  }
  if (!(res.ok || res.status === 206)) {
    throw new Error(`range ${start}-${end}: HTTP ${res.status}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  return buf;
}

async function downloadSingle(url: string, dest: string, maxRetries: number): Promise<number> {
  let attempt = 0;
  for (;;) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { writeFile } = await import('node:fs/promises');
      const buf = new Uint8Array(await res.arrayBuffer());
      await writeFile(dest, buf);
      return buf.byteLength;
    } catch (err) {
      attempt++;
      if (attempt > maxRetries) throw err;
      await Bun.sleep(300 * attempt);
    }
  }
}

async function fileSizeOnDisk(path: string): Promise<number> {
  try {
    const file = Bun.file(path);
    if (!(await file.exists())) return 0;
    return file.size;
  } catch {
    return 0;
  }
}

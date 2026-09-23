import { afterEach, describe, expect, test } from 'bun:test';
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadFileParallel } from '../src/ingest/parallel-download';

const dirs: string[] = [];

afterEach(async () => {
  while (dirs.length) {
    const d = dirs.pop()!;
    await rm(d, { recursive: true, force: true });
  }
});

function tmp(): string {
  const d = join(tmpdir(), `wca-dl-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  dirs.push(d);
  return d;
}

describe('parallel download', () => {
  test('downloads via HTTP ranges from a local server', async () => {
    const payload = new Uint8Array(3 * 1024 * 1024 + 123);
    for (let i = 0; i < payload.length; i++) payload[i] = i % 251;

    const server = Bun.serve({
      port: 0,
      idleTimeout: 30,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname !== '/blob.bin') return new Response('nope', { status: 404 });

        const range = req.headers.get('range');
        if (range) {
          const m = range.match(/bytes=(\d+)-(\d+)/);
          if (!m) return new Response('bad range', { status: 416 });
          const start = Number(m[1]);
          const end = Number(m[2]);
          const slice = payload.subarray(start, end + 1);
          return new Response(slice, {
            status: 206,
            headers: {
              'Content-Range': `bytes ${start}-${end}/${payload.length}`,
              'Accept-Ranges': 'bytes',
              'Content-Length': String(slice.byteLength),
            },
          });
        }

        return new Response(payload, {
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(payload.byteLength),
          },
        });
      },
    });

    const dir = tmp();
    const dest = join(dir, 'blob.bin');
    const result = await downloadFileParallel({
      url: `http://127.0.0.1:${server.port}/blob.bin`,
      dest,
      connections: 4,
      chunkSize: 256 * 1024,
      log: () => {},
    });

    expect(result.mode).toBe('range');
    expect(result.bytes).toBe(payload.byteLength);
    expect(result.connections).toBe(4);

    const file = Bun.file(dest);
    const got = new Uint8Array(await file.arrayBuffer());
    expect(got.byteLength).toBe(payload.byteLength);
    expect(Buffer.from(got).equals(Buffer.from(payload))).toBe(true);

    await server.stop(true);
  });

  test('skips when file already complete', async () => {
    const payload = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const server = Bun.serve({
      port: 0,
      fetch() {
        return new Response(payload, {
          headers: {
            'Accept-Ranges': 'bytes',
            'Content-Length': String(payload.byteLength),
          },
        });
      },
    });

    const dir = tmp();
    const dest = join(dir, 'done.bin');
    await Bun.write(dest, payload);

    const result = await downloadFileParallel({
      url: `http://127.0.0.1:${server.port}/done.bin`,
      dest,
      log: () => {},
    });
    expect(result.connections).toBe(0);
    expect(result.bytes).toBe(8);
    await server.stop(true);
  });
});

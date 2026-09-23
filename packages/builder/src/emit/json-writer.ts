import { mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface JsonWriter {
  write(relPath: string, data: unknown): Promise<void>;
  outDir: string;
}

export function createJsonWriter(outDir: string): JsonWriter {
  let chain: Promise<unknown> = Promise.resolve();
  const write = (relPath: string, data: unknown): Promise<void> => {
    const task = async () => {
      const full = join(outDir, relPath);
      await mkdir(dirname(full), { recursive: true });
      await Bun.write(full, JSON.stringify(data));
    };
    chain = chain.then(task, task);
    return chain.then(() => undefined);
  };
  return {
    outDir,
    write: async (relPath, data) => {
      await write(relPath, data);
    },
  };
}

export async function resetOutDir(outDir: string): Promise<void> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i] as T, i);
    }
  });
  await Promise.all(workers);
  return results;
}

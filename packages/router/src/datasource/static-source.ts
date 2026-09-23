import { join } from 'node:path';

export interface StaticSource {
  readJson(path: string): Promise<unknown | null>;
  exists(path: string): Promise<boolean>;
  describe(): string;
}

export class LocalDirSource implements StaticSource {
  constructor(private readonly root: string) {}

  describe(): string {
    return `local:${this.root}`;
  }

  async exists(path: string): Promise<boolean> {
    return Bun.file(join(this.root, path)).exists();
  }

  async readJson(path: string): Promise<unknown | null> {
    const file = Bun.file(join(this.root, path));
    if (!(await file.exists())) return null;
    try {
      return await file.json();
    } catch {
      return null;
    }
  }
}

export class HttpStaticSource implements StaticSource {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  describe(): string {
    return `http:${this.baseUrl}`;
  }

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  async exists(path: string): Promise<boolean> {
    const res = await this.fetchImpl(this.url(path), { method: 'HEAD' });
    return res.ok;
  }

  async readJson(path: string): Promise<unknown | null> {
    const res = await this.fetchImpl(this.url(path));
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to read ${path}: ${res.status}`);
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
}

export class CompositeSource implements StaticSource {
  constructor(private readonly sources: StaticSource[]) {}

  describe(): string {
    return this.sources.map((s) => s.describe()).join(' -> ');
  }

  async exists(path: string): Promise<boolean> {
    for (const s of this.sources) {
      if (await s.exists(path)) return true;
    }
    return false;
  }

  async readJson(path: string): Promise<unknown | null> {
    for (const s of this.sources) {
      const value = await s.readJson(path);
      if (value !== null) return value;
    }
    return null;
  }
}

export type { Overview } from '@wca/shared';

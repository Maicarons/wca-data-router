import { join } from 'node:path';
import { parse } from 'yaml';

const OPENAPI_FILENAMES = ['openapi.yml', 'openapi.yaml'];

function candidatePaths(): string[] {
  const roots = [
    join(import.meta.dir, '../../../docs'),
    join(import.meta.dir, '../../docs'),
    join(import.meta.dir, '../docs'),
    join(process.cwd(), 'docs'),
    join(process.cwd(), 'packages/docs/docs'),
    process.cwd(),
  ];
  const out: string[] = [];
  for (const root of roots) {
    for (const name of OPENAPI_FILENAMES) {
      out.push(join(root, name));
    }
  }
  return out;
}

export type OpenApiDocument = Record<string, unknown>;

let cached: OpenApiDocument | null = null;

export async function loadOpenApiDocument(): Promise<OpenApiDocument> {
  if (cached) return cached;
  const { readFile } = await import('node:fs/promises');
  for (const path of candidatePaths()) {
    try {
      const raw = await readFile(path, 'utf8');
      const doc = parse(raw) as OpenApiDocument;
      if (doc && typeof doc === 'object' && doc.openapi) {
        cached = doc;
        return doc;
      }
    } catch {
      // try next
    }
  }
  cached = fallbackOpenApiDocument();
  return cached;
}

/** Minimal fallback if docs/openapi.yml is not packaged with the runtime. */
export function fallbackOpenApiDocument(): OpenApiDocument {
  return {
    openapi: '3.0.3',
    info: {
      title: 'WCA Data Router API',
      version: '0.1.0',
      description:
        'Unofficial WCA static JSON API and REST router. Full specification is published as docs/openapi.yml.',
    },
    paths: {
      '/health': {
        get: {
          tags: ['meta'],
          summary: 'Health check',
          responses: { '200': { description: 'OK' } },
        },
      },
      '/v1/version': {
        get: {
          tags: ['meta'],
          summary: 'Export version metadata',
          responses: { '200': { description: 'Version info' } },
        },
      },
      '/v1/competitions': {
        get: {
          tags: ['competition'],
          summary: 'List competitions',
          parameters: [
            { name: 'page', in: 'query', schema: { type: 'integer' } },
            { name: 'size', in: 'query', schema: { type: 'integer' } },
            { name: 'country', in: 'query', schema: { type: 'string' } },
            { name: 'year', in: 'query', schema: { type: 'string' } },
            { name: 'month', in: 'query', schema: { type: 'string' } },
            { name: 'day', in: 'query', schema: { type: 'string' } },
            { name: 'event', in: 'query', schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Overview' } },
        },
      },
      '/v1/persons/{id}': {
        get: {
          tags: ['person'],
          summary: 'Person profile',
          responses: { '200': { description: 'Person' } },
        },
      },
    },
  };
}

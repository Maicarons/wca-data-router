import { describe, expect, test } from 'bun:test';
import { fallbackOpenApiDocument, loadOpenApiDocument } from '../src/openapi';

describe('openapi', () => {
  test('loads full document from docs/openapi.yml', async () => {
    const doc = await loadOpenApiDocument();
    expect(doc.openapi).toBe('3.0.3');
    const paths = doc.paths as Record<string, unknown>;
    for (const p of [
      '/health',
      '/openapi.json',
      '/v1/version',
      '/v1/manifest',
      '/v1/continents',
      '/v1/countries',
      '/v1/events',
      '/v1/competitions',
      '/v1/competitions/{id}',
      '/v1/championships',
      '/v1/championships/{id}',
      '/v1/persons',
      '/v1/persons/{id}',
      '/v1/ranks/{region}/{type}/{eventId}',
      '/v1/results/{competitionId}',
      '/v1/results/{competitionId}/{eventId}',
    ]) {
      expect(paths[p], `missing path ${p}`).toBeTruthy();
    }
    const components = doc.components as { schemas?: Record<string, unknown> };
    for (const s of [
      'VersionInfo',
      'Manifest',
      'Competition',
      'Championship',
      'PersonSummary',
      'Person',
      'Rank',
      'Result',
      'Error',
      'CompetitionsOverview',
    ]) {
      expect(components?.schemas?.[s], `missing schema ${s}`).toBeTruthy();
    }
  });

  test('fallback document is valid openapi shape', () => {
    const doc = fallbackOpenApiDocument();
    expect(doc.openapi).toBe('3.0.3');
    expect((doc.paths as Record<string, unknown>)['/health']).toBeTruthy();
  });
});

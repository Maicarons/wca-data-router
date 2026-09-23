import { describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildApi } from '../src/pipeline';

const fixtureExport = join(import.meta.dir, 'fixtures', 'export');

describe('builder integration (fixture export)', () => {
  test('emits static api tree', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'wca-api-'));
    const workDir = await mkdtemp(join(tmpdir(), 'wca-work-'));
    try {
      const result = await buildApi({
        outDir,
        workDir,
        fromLocal: fixtureExport,
        force: true,
        log: () => {},
      });
      expect(result.skipped).toBe(false);
      expect(result.files).toBeGreaterThan(5);

      const version = await Bun.file(join(outDir, 'version.json')).json();
      expect(version.export_date).toContain('2026-09-23');

      const persons = await Bun.file(join(outDir, 'persons.json')).json();
      expect(persons.total).toBe(2);
      expect(persons.items[0]).toHaveProperty('medals');
      expect(persons.items[0]).not.toHaveProperty('results');

      const person = await Bun.file(join(outDir, 'persons/2012TEST01.json')).json();
      expect(person.id).toBe('2012TEST01');
      expect(person.rank.singles[0]?.rank.world).toBe(1);
      expect(person.results.Comp2024['333'][0].solves).toEqual([500, 550, 520, 610, 530]);

      const results = await Bun.file(join(outDir, 'results/Comp2024.json')).json();
      expect(results.total).toBe(2);

      const rank = await Bun.file(join(outDir, 'rank/world/single/333.json')).json();
      expect(rank.items[0].personId).toBe('2012TEST01');

      const comp = await Bun.file(join(outDir, 'competitions/Comp2024.json')).json();
      expect(comp.country).toBe('PL');
      expect(comp.date.numberOfDays).toBe(1);

      const champ = await Bun.file(join(outDir, 'championships/WC2023.json')).json();
      expect(champ.region).toBe('world');
    } finally {
      await rm(outDir, { recursive: true, force: true });
      await rm(workDir, { recursive: true, force: true });
    }
  });
});

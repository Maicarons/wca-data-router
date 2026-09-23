import {
  DEFAULT_PAGE_SIZE,
  staticPaths,
  type Overview,
  type PersonSummary,
} from '@wca/shared';
import { loadAllTables } from './ingest/load';
import {
  extractZip,
  fetchExportInfo,
  loadLocalExport,
} from './ingest/download';
import { downloadFileParallel } from './ingest/parallel-download';
import { resolveExportDownloadUrls } from './ingest/resolve-download';
import { MemoryStore, slug } from './store/memory-store';
import { createJsonWriter, mapPool, resetOutDir } from './emit/json-writer';
import {
  buildManifest,
  buildVersion,
  mapChampionships,
  mapCompetition,
  mapContinent,
  mapCountries,
  mapEvents,
  mapPerson,
  mapRankItems,
  mapResultsForCompetition,
  personSummary,
} from './builders/mappers';

export interface BuildOptions {
  outDir: string;
  workDir: string;
  fromLocal?: string;
  force?: boolean;
  only?: string[];
  personSharded?: boolean;
  log?: (msg: string) => void;
  fetchExportUrl?: string;
  tsvUrl?: string;
  /** Parallel download connections (default 4; raise carefully — origin may rate-limit). */
  downloadConnections?: number;
}

const ALL_ENTITIES = [
  'continent',
  'country',
  'event',
  'competition',
  'championship',
  'person',
  'rank',
  'result',
  'version',
] as const;

export async function buildApi(options: BuildOptions): Promise<{
  files: number;
  exportDate: string;
  skipped: boolean;
}> {
  const log = options.log ?? ((m: string) => console.log(m));
  const only = options.only?.length
    ? new Set(options.only)
    : new Set<string>(ALL_ENTITIES);
  const pageSize = DEFAULT_PAGE_SIZE;

  log('Resolving WCA export…');
  let exportDate = new Date().toISOString();
  let exportFormatVersion = '2.0.0';
  let sqlUrl: string | undefined;
  let tsvUrl: string | undefined;
  let tables: Map<string, string>;

  if (options.fromLocal) {
    const local = await loadLocalExport(options.fromLocal);
    tables = local.tables;
    exportDate = local.exportDate;
    exportFormatVersion = local.exportFormatVersion;
    log(`Using local export at ${options.fromLocal} (${tables.size} tables)`);
  } else {
    const info = await fetchExportInfo(options.fetchExportUrl);
    exportDate = info.export_date;
    exportFormatVersion = info.export_format_version;
    sqlUrl = info.sql_url;
    tsvUrl = options.tsvUrl ?? info.tsv_url;
    // Permalink /export/results/v2/tsv is not a stable file URL — resolve to exports CDN
    const resolved = await resolveExportDownloadUrls({
      tsvUrl: options.tsvUrl ?? info.tsv_url,
      sqlUrl: info.sql_url,
    });
    tsvUrl = resolved.tsvUrl;
    sqlUrl = resolved.sqlUrl;
    log(`TSV download URL (${resolved.source}): ${tsvUrl}`);
    log(`Export date: ${exportDate}, format ${exportFormatVersion}`);

    if (!options.force) {
      const existing = Bun.file(`${options.outDir}/version.json`);
      if (await existing.exists()) {
        try {
          const current = await existing.json();
          if (current.export_date === exportDate) {
            log('No new export version, skipping build.');
            return { files: 0, exportDate, skipped: true };
          }
        } catch {
          // rebuild
        }
      }
    }

    if (!tsvUrl) throw new Error('No TSV URL available for export download');
    const zipPath = `${options.workDir}/export.zip`;
    const extractDir = `${options.workDir}/export`;
    log(`Downloading TSV export (parallel)…`);
    const dl = await downloadFileParallel({
      url: tsvUrl,
      dest: zipPath,
      connections: options.downloadConnections ?? 4,
      log,
    });
    log(
      `Downloaded ${dl.bytes} bytes in ${(dl.ms / 1000).toFixed(1)}s (${dl.mode}, ${dl.connections} conn)`,
    );
    log(`Extracting ${zipPath}…`);
    await extractZip(zipPath, extractDir);
    const local = await loadLocalExport(extractDir);
    tables = local.tables;
    if (local.exportDate) exportDate = local.exportDate;
    if (local.exportFormatVersion) exportFormatVersion = local.exportFormatVersion;
  }

  log('Loading tables into memory…');
  const store = new MemoryStore();
  await loadAllTables(store, tables, log);
  store.buildIndexes();
  log(
    `Loaded: continents=${store.continents.size} countries=${store.countries.size} events=${store.events.size} competitions=${store.competitions.size} persons=${store.persons.size} results=${store.results.length} ranks_s=${store.ranksSingle.length} ranks_a=${store.ranksAverage.length}`,
  );

  log(`Writing static API to ${options.outDir}…`);
  await resetOutDir(options.outDir);
  const writer = createJsonWriter(options.outDir);
  let files = 0;
  const count = async (rel: string, data: unknown) => {
    await writer.write(rel, data);
    files++;
  };

  const resources: Record<string, number> = {};
  const generatedAt = new Date().toISOString();
  const version = buildVersion(
    { export_date: exportDate, export_format_version: exportFormatVersion, sql_url: sqlUrl, tsv_url: tsvUrl },
    generatedAt,
  );

  // --- general ---
  if (only.has('continent')) {
    const items = mapContinent(store);
    await count(staticPaths.continents(), {
      pagination: { page: 1, size: items.length || 1 },
      total: items.length,
      items,
    });
    resources.continents = items.length;
  }
  if (only.has('country')) {
    const items = mapCountries(store);
    await count(staticPaths.countries(), {
      pagination: { page: 1, size: items.length || 1 },
      total: items.length,
      items,
    });
    resources.countries = items.length;
  }
  if (only.has('event')) {
    const items = mapEvents(store);
    await count(staticPaths.events(), {
      pagination: { page: 1, size: items.length || 1 },
      total: items.length,
      items,
    });
    resources.events = items.length;
  }

  // --- competitions ---
  if (only.has('competition')) {
    const comps = [...store.competitions.keys()].sort().map((id) => mapCompetition(store, id)!);
    resources.competitions = comps.length;

    // paged list (summary uses full competition objects for v1 compatibility)
    const pages = Math.max(1, Math.ceil(comps.length / pageSize));
    for (let page = 1; page <= pages; page++) {
      const slice = comps.slice((page - 1) * pageSize, page * pageSize);
      const overview: Overview<(typeof comps)[number]> = {
        pagination: { page, size: slice.length || pageSize },
        total: comps.length,
        items: slice,
      };
      await count(staticPaths.competitionsPage(page), overview);
    }

    // by id + filters
    await mapPool(comps, 32, async (comp) => {
      await count(staticPaths.competitionById(comp.id), comp);
    });

    for (const [iso2, ids] of store.competitionIdsByCountry) {
      const items = ids.map((id) => mapCompetition(store, id)!).filter(Boolean);
      items.sort((a, b) => a.date.from.localeCompare(b.date.from));
      await count(staticPaths.competitionsByCountry(iso2), {
        pagination: { page: 1, size: items.length || 1 },
        total: items.length,
        items,
      });
    }

    for (const [year, ids] of store.competitionIdsByYear) {
      const items = ids.map((id) => mapCompetition(store, id)!).filter(Boolean);
      items.sort((a, b) => a.date.from.localeCompare(b.date.from));
      await count(staticPaths.competitionsByYear(year), {
        pagination: { page: 1, size: items.length || 1 },
        total: items.length,
        items,
      });

      // month / day slices
      const byMonth = new Map<string, typeof items>();
      const byDay = new Map<string, typeof items>();
      for (const item of items) {
        const m = item.date.from.slice(0, 7); // YYYY-MM
        const d = item.date.from.slice(0, 10);
        pushArr(byMonth, m, item);
        pushArr(byDay, d, item);
      }
      for (const [monthKey, list] of byMonth) {
        const [y, m] = monthKey.split('-');
        await count(staticPaths.competitionsByMonth(y!, m!), {
          pagination: { page: 1, size: list.length || 1 },
          total: list.length,
          items: list,
        });
      }
      for (const [dayKey, list] of byDay) {
        const [y, m, d] = dayKey.split('-');
        await count(staticPaths.competitionsByDay(y!, m!, d!), {
          pagination: { page: 1, size: list.length || 1 },
          total: list.length,
          items: list,
        });
      }
    }

    for (const [eventId, ids] of store.competitionIdsByEvent) {
      const unique = [...new Set(ids)];
      const items = unique.map((id) => mapCompetition(store, id)!).filter(Boolean);
      items.sort((a, b) => b.date.from.localeCompare(a.date.from));
      const pages = Math.max(1, Math.ceil(items.length / pageSize));
      for (let page = 1; page <= pages; page++) {
        const slice = items.slice((page - 1) * pageSize, page * pageSize);
        await count(staticPaths.competitionsByEvent(eventId, page), {
          pagination: { page, size: slice.length || pageSize },
          total: items.length,
          items: slice,
        });
      }
    }
  }

  // --- championships ---
  if (only.has('championship')) {
    const champs = mapChampionships(store);
    resources.championships = champs.length;
    const pages = Math.max(1, Math.ceil(champs.length / pageSize));
    for (let page = 1; page <= pages; page++) {
      const slice = champs.slice((page - 1) * pageSize, page * pageSize);
      await count(staticPaths.championshipsPage(page), {
        pagination: { page, size: slice.length || pageSize },
        total: champs.length,
        items: slice,
      });
    }
    for (const champ of champs) {
      await count(staticPaths.championshipById(champ.id), champ);
    }
    const byType = new Map<string, typeof champs>();
    for (const champ of champs) {
      pushArr(byType, champ.region, champ);
    }
    for (const [type, list] of byType) {
      await count(staticPaths.championshipsByType(type), {
        pagination: { page: 1, size: list.length || 1 },
        total: list.length,
        items: list,
      });
    }
  }

  // --- persons ---
  if (only.has('person')) {
    const ids = [...store.persons.keys()].sort();
    // prefer primary sub_id = 1
    const primaryIds = ids.filter((id) => (store.persons.get(id)?.subId ?? 1) === 1);
    const listIds = primaryIds.length ? primaryIds : ids;
    const summaries: PersonSummary[] = [];
    for (const id of listIds) {
      const s = personSummary(store, id);
      if (s) summaries.push(s);
    }
    resources.persons = summaries.length;

    const pages = Math.max(1, Math.ceil(summaries.length / pageSize));
    for (let page = 1; page <= pages; page++) {
      const slice = summaries.slice((page - 1) * pageSize, page * pageSize);
      await count(staticPaths.personsPage(page), {
        pagination: { page, size: slice.length || pageSize },
        total: summaries.length,
        items: slice,
      });
    }

    await mapPool(listIds, 48, async (id) => {
      const person = mapPerson(store, id);
      if (!person) return;
      const rel = options.personSharded
        ? staticPaths.personShardById(id)
        : staticPaths.personById(id);
      await writer.write(rel, person);
      files++;
    });
  }

  // --- ranks ---
  if (only.has('rank')) {
    const continents = mapContinent(store);
    const countries = mapCountries(store);
    const events = mapEvents(store);
    const types = ['single', 'average'] as const;
    let rankFiles = 0;

    for (const rankType of types) {
      for (const event of events) {
        const all = mapRankItems(
          store,
          rankType,
          (r) => r.eventId === event.id,
        );

        const world = all
          .filter((item) => item.rank.world > 0)
          .sort((a, b) => a.rank.world - b.rank.world)
          .slice(0, 1000);
        if (world.length) {
          await count(staticPaths.rank('world', rankType, event.id), {
            pagination: { page: 1, size: world.length },
            total: world.length,
            items: world,
          });
          rankFiles++;
        }

        for (const continent of continents) {
          const rows = all.filter((item) => {
            const person = store.persons.get(item.personId);
            const country = person ? store.countryById.get(person.countryId) : undefined;
            return (
              item.rank.continent > 0 &&
              country &&
              slug(store.continents.get(country.continentId)?.name ?? '') === continent.id
            );
          });
          rows.sort((a, b) => a.rank.continent - b.rank.continent);
          const top = rows.slice(0, 1000);
          if (!top.length) continue;
          await count(staticPaths.rank(continent.id, rankType, event.id), {
            pagination: { page: 1, size: top.length },
            total: top.length,
            items: top,
          });
          rankFiles++;
        }

        for (const country of countries) {
          const rows = all.filter((item) => {
            const person = store.persons.get(item.personId);
            const c = person ? store.countryById.get(person.countryId) : undefined;
            return item.rank.country > 0 && c?.iso2 === country.iso2Code;
          });
          rows.sort((a, b) => a.rank.country - b.rank.country);
          const top = rows.slice(0, 1000);
          if (!top.length) continue;
          await count(staticPaths.rank(country.iso2Code, rankType, event.id), {
            pagination: { page: 1, size: top.length },
            total: top.length,
            items: top,
          });
          rankFiles++;
        }
      }
    }
    resources.rankFiles = rankFiles;
  }

  // --- results ---
  if (only.has('result')) {
    let resultFiles = 0;
    await mapPool([...store.competitions.keys()], 16, async (competitionId) => {
      const items = mapResultsForCompetition(store, competitionId);
      if (!items.length) return;
      await count(staticPaths.resultsByCompetition(competitionId), {
        pagination: { page: 1, size: items.length },
        total: items.length,
        items,
      });
      resultFiles++;

      const byEvent = new Map<string, typeof items>();
      for (const item of items) pushArr(byEvent, item.eventId, item);
      for (const [eventId, list] of byEvent) {
        await count(staticPaths.resultsByCompetitionEvent(competitionId, eventId), {
          pagination: { page: 1, size: list.length },
          total: list.length,
          items: list,
        });
        resultFiles++;
      }
    });
    resources.resultFiles = resultFiles;
  }

  if (only.has('version') || true) {
    await count(staticPaths.version(), version);
  }

  const manifest = buildManifest(store, version, resources);
  await count(staticPaths.manifest(), manifest);

  log(`Done. Wrote ${files} files.`);
  return { files, exportDate, skipped: false };
}

function pushArr<T>(map: Map<string, T[]>, key: string, value: T): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

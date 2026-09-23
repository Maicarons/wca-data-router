import {
  overviewAll,
  type Championship,
  type Competition,
  type Continent,
  type Country,
  type EventItem,
  type PersonRef,
  type PersonResultEntry,
  type PersonSummary,
  type Person,
  type Rank,
  type ResultItem,
  type VersionInfo,
  type Manifest,
} from '@wca/shared';
import type { MemoryStore, ResultRow } from '../store/memory-store';
import { slug } from '../store/memory-store';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parsePersonRefs(raw: string): PersonRef[] {
  if (!raw) return [];
  // export may use "Name <email>; Name2" or JSON-ish
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p) =>
        typeof p === 'string'
          ? parseOneRef(p)
          : {
              name: String((p as any).name ?? ''),
              email: (p as any).email ? String((p as any).email) : null,
            },
      );
    }
  } catch {
    // not JSON
  }
  return raw
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseOneRef);
}

function parseOneRef(input: string): PersonRef {
  const m = input.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1] ?? input, email: m[2] ?? null };
  return { name: input, email: null };
}

export function mapContinent(store: MemoryStore): Continent[] {
  return [...store.continents.values()].map((c) => ({
    id: slug(c.name),
    name: c.name,
  }));
}

export function mapCountries(store: MemoryStore): Country[] {
  return [...store.countries.values()].map((c) => ({
    iso2Code: c.iso2,
    name: c.name,
  }));
}

export function mapEvents(store: MemoryStore): EventItem[] {
  return [...store.events.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((e) => ({
      id: e.id,
      name: e.name,
      format: e.format,
    }));
}

export function mapCompetition(store: MemoryStore, id: string): Competition | null {
  const row = store.competitions.get(id);
  if (!row) return null;
  const iso2 = store.countryIso2ById.get(row.countryId) ?? row.countryId;
  const from = isoDate(row.year, row.month, row.day);
  let till = isoDate(row.endYear || row.year, row.endMonth || row.month, row.endDay || row.day);
  let fromD = new Date(from);
  let tillD = new Date(till);
  if (fromD > tillD) {
    till = isoDate((row.endYear || row.year) + 1, row.endMonth || row.month, row.endDay || row.day);
    tillD = new Date(till);
  }
  const numberOfDays = Math.floor((tillD.getTime() - fromD.getTime()) / 86400000) + 1;

  const events = [...new Set((store.resultsByCompetition.get(id) ?? []).map((r) => r.eventId))]
    .sort((a, b) => (store.eventOrder.get(a) ?? 0) - (store.eventOrder.get(b) ?? 0));

  const coordinates =
    row.latitudeMicrodegrees || row.longitudeMicrodegrees
      ? {
          latitude: row.latitudeMicrodegrees / 1_000_000,
          longitude: row.longitudeMicrodegrees / 1_000_000,
        }
      : null;

  return {
    id: row.id,
    name: row.name,
    city: row.cityName,
    country: iso2,
    date: { from, till, numberOfDays },
    isCanceled: row.cancelled === '1' || row.cancelled?.toLowerCase() === 'true',
    events,
    wcaDelegates: parsePersonRefs(row.delegates),
    organisers: parsePersonRefs(row.organizers).filter((p) => p.name),
    venue: {
      name: row.venue,
      address: row.venueAddress || null,
      details: row.venueDetails || null,
      coordinates,
    },
    information: row.information || null,
    externalWebsite: row.externalWebsite || null,
  };
}

export function mapChampionships(store: MemoryStore): Championship[] {
  const byComp = store.championshipTypeByCompetition;
  const out: Championship[] = [];
  for (const [competitionId, types] of byComp) {
    const comp = mapCompetition(store, competitionId);
    if (!comp) continue;
    for (const t of types) {
      out.push({
        ...comp,
        region: slug(t === 'world' ? 'world' : t),
      });
    }
  }
  return out;
}

function isFinalRound(store: MemoryStore, roundTypeId: string): boolean {
  const rt = store.roundTypes.get(roundTypeId);
  return rt?.final === '1' || rt?.final?.toLowerCase() === 'true';
}

function mapResult(store: MemoryStore, row: ResultRow): ResultItem {
  const roundName = store.roundTypes.get(row.roundTypeId)?.name ?? row.roundTypeId;
  const formatName = store.formats.get(row.formatId)?.name ?? row.formatId;
  return {
    competitionId: row.competitionId,
    personId: row.personId,
    eventId: row.eventId,
    round: roundName,
    position: row.pos,
    best: row.best,
    average: row.average,
    format: formatName,
    solves: store.solvesForResult(row.id),
  };
}

function sortResults(store: MemoryStore, rows: ResultRow[]): ResultRow[] {
  return [...rows].sort((a, b) => {
    const er = (store.eventOrder.get(a.eventId) ?? 0) - (store.eventOrder.get(b.eventId) ?? 0);
    if (er !== 0) return er;
    const rr = (store.roundOrder.get(b.roundTypeId) ?? 0) - (store.roundOrder.get(a.roundTypeId) ?? 0);
    if (rr !== 0) return rr;
    return a.pos - b.pos;
  });
}

export function mapResultsForCompetition(
  store: MemoryStore,
  competitionId: string,
  eventId?: string,
): ResultItem[] {
  let rows = store.resultsByCompetition.get(competitionId) ?? [];
  if (eventId) rows = rows.filter((r) => r.eventId === eventId);
  return sortResults(store, rows).map((r) => mapResult(store, r));
}

export function mapRankItems(
  store: MemoryStore,
  type: 'single' | 'average',
  filter: (rank: {
    personId: string;
    eventId: string;
    worldRank: number;
    continentRank: number;
    countryRank: number;
    countryIso2: string;
    continentId: string;
  }) => boolean,
): Rank[] {
  const source = type === 'single' ? store.ranksSingle : store.ranksAverage;
  const rows = source
    .map((r) => {
      const person = store.persons.get(r.personId);
      const countryId = person?.countryId ?? '';
      const country = store.countryById.get(countryId);
      return {
        ...r,
        countryIso2: country?.iso2 ?? '',
        continentId: country?.continentId ?? '',
      };
    })
    .filter((r) => filter(r))
    .sort((a, b) => a.worldRank - b.worldRank);

  return rows.map((r) => ({
    rankType: type,
    personId: r.personId,
    eventId: r.eventId,
    best: r.best,
    rank: {
      world: r.worldRank,
      continent: r.continentRank,
      country: r.countryRank,
    },
  }));
}

export function personSummary(store: MemoryStore, wcaId: string): PersonSummary | null {
  const person = store.persons.get(wcaId);
  if (!person) return null;
  const results = store.resultsByPerson.get(wcaId) ?? [];
  let gold = 0;
  let silver = 0;
  let bronze = 0;
  for (const r of results) {
    if (!isFinalRound(store, r.roundTypeId)) continue;
    if (r.pos === 1) gold++;
    else if (r.pos === 2) silver++;
    else if (r.pos === 3) bronze++;
  }
  const competitionIds = store.competitionIdsByPerson.get(wcaId) ?? new Set();
  const championshipIds = store.championshipIdsByPerson.get(wcaId) ?? new Set();
  return {
    id: wcaId,
    name: person.name,
    slug: slug(person.name),
    country: store.countryIso2ById.get(person.countryId) ?? person.countryId,
    numberOfCompetitions: competitionIds.size,
    numberOfChampionships: championshipIds.size,
    medals: { gold, silver, bronze },
  };
}

export function mapPerson(store: MemoryStore, wcaId: string): Person | null {
  const summary = personSummary(store, wcaId);
  if (!summary) return null;
  const ranks = store.ranksByPerson.get(wcaId) ?? { single: [], average: [] };
  const results = store.resultsByPerson.get(wcaId) ?? [];

  const rankMap = (rows: typeof ranks.single) =>
    rows.map((r) => ({
      eventId: r.eventId,
      best: r.best,
      rank: {
        world: r.worldRank,
        continent: r.continentRank,
        country: r.countryRank,
      },
    }));

  const resultsNested: Record<string, Record<string, PersonResultEntry[]>> = {};
  const sorted = [...results].sort((a, b) => {
    const ca = store.competitions.get(a.competitionId);
    const cb = store.competitions.get(b.competitionId);
    const ya = ca ? ca.year * 10000 + ca.month * 100 + ca.day : 0;
    const yb = cb ? cb.year * 10000 + cb.month * 100 + cb.day : 0;
    if (ya !== yb) return yb - ya;
    const er = (store.eventOrder.get(a.eventId) ?? 0) - (store.eventOrder.get(b.eventId) ?? 0);
    if (er !== 0) return er;
    return (store.roundOrder.get(b.roundTypeId) ?? 0) - (store.roundOrder.get(a.roundTypeId) ?? 0);
  });

  const singleRecords: Record<string, number> = {};
  const averageRecords: Record<string, number> = {};

  for (const r of sorted) {
    const mapped = mapResult(store, r);
    const round = store.roundTypes.get(r.roundTypeId)?.name ?? r.roundTypeId;
    const formatName = store.formats.get(r.formatId)?.name ?? r.formatId;
    const entry: PersonResultEntry = {
      round,
      position: r.pos,
      best: r.best,
      average: r.average,
      format: formatName,
      solves: mapped.solves,
    };
    const byEvent = resultsNested[r.competitionId] ?? {};
    const list = byEvent[r.eventId] ?? [];
    list.push(entry);
    byEvent[r.eventId] = list;
    resultsNested[r.competitionId] = byEvent;

    if (r.regionalSingleRecord) {
      singleRecords[r.regionalSingleRecord] = (singleRecords[r.regionalSingleRecord] ?? 0) + 1;
    }
    if (r.regionalAverageRecord) {
      averageRecords[r.regionalAverageRecord] = (averageRecords[r.regionalAverageRecord] ?? 0) + 1;
    }
  }

  return {
    ...summary,
    competitionIds: [...(store.competitionIdsByPerson.get(wcaId) ?? [])].sort(),
    championshipIds: [...(store.championshipIdsByPerson.get(wcaId) ?? [])].sort(),
    rank: {
      singles: rankMap(ranks.single),
      averages: rankMap(ranks.average),
    },
    records: {
      single: singleRecords,
      average: averageRecords,
    },
    results: resultsNested,
  };
}

export function buildVersion(
  exportInfo: { export_date: string; export_format_version: string; sql_url?: string; tsv_url?: string },
  generatedAt: string,
): VersionInfo {
  return {
    export_date: exportInfo.export_date,
    export_format_version: exportInfo.export_format_version,
    sql_url: exportInfo.sql_url,
    tsv_url: exportInfo.tsv_url,
    generated_at: generatedAt,
    attribution:
      'This information is based on competition results owned and maintained by the World Cube Association, published at https://www.worldcubeassociation.org/export/results.',
  };
}

export function buildManifest(
  store: MemoryStore,
  version: VersionInfo,
  resources: Record<string, number>,
): Manifest {
  return {
    generated_at: version.generated_at ?? new Date().toISOString(),
    export_date: version.export_date,
    export_format_version: version.export_format_version,
    resources,
    person_layout: 'flat',
  };
}

export function overviewOf<T>(items: T[]) {
  return overviewAll(items);
}

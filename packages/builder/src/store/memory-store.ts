export interface ContinentRow {
  id: string;
  name: string;
  recordName?: string;
}

export interface CountryRow {
  id: string;
  name: string;
  continentId: string;
  iso2: string;
}

export interface EventRow {
  id: string;
  name: string;
  rank: number;
  format: string;
}

export interface CompetitionRow {
  id: string;
  name: string;
  cityName: string;
  countryId: string;
  information: string;
  year: number;
  month: number;
  day: number;
  endYear: number;
  endMonth: number;
  endDay: number;
  cancelled: string;
  cancelledReason: string;
  delegates: string;
  organizers: string;
  venue: string;
  venueAddress: string;
  venueDetails: string;
  externalWebsite: string;
  latitudeMicrodegrees: number;
  longitudeMicrodegrees: number;
}

export interface ChampionshipRow {
  competitionId: string;
  championshipType: string;
}

export interface PersonRow {
  wcaId: string;
  subId: number;
  name: string;
  countryId: string;
  gender: string;
  birthdate: string;
}

export interface ResultRow {
  id: number;
  personId: string;
  pos: number;
  personName: string;
  countryId: string;
  competitionId: string;
  eventId: string;
  roundTypeId: string;
  formatId: string;
  regionalSingleRecord: string;
  regionalAverageRecord: string;
  best: number;
  average: number;
}

export interface ResultAttemptRow {
  resultId: number;
  attemptNumber: number;
  value: number;
}

export interface RankRow {
  personId: string;
  eventId: string;
  best: number;
  worldRank: number;
  continentRank: number;
  countryRank: number;
}

export interface RoundTypeRow {
  id: string;
  rank: number;
  name: string;
  final: string;
  cellName: string;
}

export interface FormatRow {
  id: string;
  name: string;
  rank: number;
  expectedSolveCount: number;
  trimFastestN: number;
  trimSlowestN: number;
}

export class MemoryStore {
  continents = new Map<string, ContinentRow>();
  countries = new Map<string, CountryRow>();
  events = new Map<string, EventRow>();
  competitions = new Map<string, CompetitionRow>();
  championships: ChampionshipRow[] = [];
  persons = new Map<string, PersonRow>();
  results: ResultRow[] = [];
  attempts = new Map<number, number[]>();
  ranksSingle: RankRow[] = [];
  ranksAverage: RankRow[] = [];
  roundTypes = new Map<string, RoundTypeRow>();
  formats = new Map<string, FormatRow>();

  // indexes
  resultsByPerson = new Map<string, ResultRow[]>();
  resultsByCompetition = new Map<string, ResultRow[]>();
  ranksByPerson = new Map<string, { single: RankRow[]; average: RankRow[] }>();
  competitionIdsByPerson = new Map<string, Set<string>>();
  championshipIdsByPerson = new Map<string, Set<string>>();
  championshipTypeByCompetition = new Map<string, string[]>();
  countryIso2ById = new Map<string, string>();
  countryById = new Map<string, CountryRow>();
  continentSlugById = new Map<string, string>();
  eventOrder = new Map<string, number>();
  roundOrder = new Map<string, number>();
  competitionIdsByCountry = new Map<string, string[]>();
  competitionIdsByYear = new Map<string, string[]>();
  competitionIdsByEvent = new Map<string, string[]>();

  buildIndexes(): void {
    for (const c of this.countries.values()) {
      this.countryIso2ById.set(c.id, c.iso2);
      this.countryById.set(c.id, c);
    }
    for (const cont of this.continents.values()) {
      this.continentSlugById.set(cont.id, slug(cont.name));
    }
    for (const ev of this.events.values()) {
      this.eventOrder.set(ev.id, ev.rank);
    }
    for (const rt of this.roundTypes.values()) {
      this.roundOrder.set(rt.id, rt.rank);
    }

    for (const r of this.results) {
      push(this.resultsByPerson, r.personId, r);
      push(this.resultsByCompetition, r.competitionId, r);
      const compIds = this.competitionIdsByPerson.get(r.personId) ?? new Set();
      compIds.add(r.competitionId);
      this.competitionIdsByPerson.set(r.personId, compIds);

      const champTypes = this.championshipTypeByCompetition.get(r.competitionId);
      if (champTypes?.length) {
        const set = this.championshipIdsByPerson.get(r.personId) ?? new Set();
        set.add(r.competitionId);
        this.championshipIdsByPerson.set(r.personId, set);
      }
    }

    for (const rank of this.ranksSingle) {
      const entry = this.ranksByPerson.get(rank.personId) ?? { single: [], average: [] };
      entry.single.push(rank);
      this.ranksByPerson.set(rank.personId, entry);
    }
    for (const rank of this.ranksAverage) {
      const entry = this.ranksByPerson.get(rank.personId) ?? { single: [], average: [] };
      entry.average.push(rank);
      this.ranksByPerson.set(rank.personId, entry);
    }

    for (const champ of this.championships) {
      push(this.championshipTypeByCompetition, champ.competitionId, champ.championshipType);
    }

    for (const comp of this.competitions.values()) {
      const iso2 = this.countryIso2ById.get(comp.countryId) ?? comp.countryId;
      push(this.competitionIdsByCountry, iso2, comp.id);
      push(this.competitionIdsByYear, String(comp.year), comp.id);
    }

    // event membership from competition_events? v2 export may not include it.
    // Derive from results + a synthetic all-events list when missing.
    for (const r of this.results) {
      push(this.competitionIdsByEvent, r.eventId, r.competitionId);
    }
  }

  solvesForResult(resultId: number): number[] {
    const raw = this.attempts.get(resultId) ?? [];
    const solves = [...raw];
    while (solves.length < 5) solves.push(0);
    return solves.slice(0, Math.max(5, solves.length));
  }
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

export function slug(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

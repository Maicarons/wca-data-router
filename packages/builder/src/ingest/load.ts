import { iterateTsvRows, toInt } from '../ingest/stream';
import type {
  ChampionshipRow,
  CompetitionRow,
  CountryRow,
  EventRow,
  FormatRow,
  MemoryStore,
  PersonRow,
  RankRow,
  ResultRow,
  RoundTypeRow,
} from '../store/memory-store';

type Row = Record<string, string>;

function pick(row: Row, ...keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== '') return row[k];
    // case-insensitive fallback
    const found = Object.keys(row).find((rk) => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== '') return row[found] as string;
  }
  return '';
}

function pickNum(row: Row, ...keys: string[]): number {
  return toInt(pick(row, ...keys), 0);
}

export async function loadAllTables(
  store: MemoryStore,
  tables: Map<string, string>,
  log: (msg: string) => void = () => {},
): Promise<void> {
  const load = async (name: string, fn: (row: Row) => void) => {
    const file = tables.get(name);
    if (!file) {
      log(`  skip ${name} (missing)`);
      return;
    }
    log(`  load ${name}`);
    for await (const row of iterateTsvRows(file)) {
      fn(row);
    }
  };

  await load('continents', (row) => {
    const id = pick(row, 'id');
    if (!id) return;
    store.continents.set(id, {
      id,
      name: pick(row, 'name'),
      recordName: pick(row, 'recordName') || undefined,
    });
  });

  await load('countries', (row) => {
    const id = pick(row, 'id');
    if (!id) return;
    const rec = {
      id,
      name: pick(row, 'name'),
      continentId: pick(row, 'continent_id', 'continentId'),
      iso2: pick(row, 'iso2', 'iso2Code'),
    } satisfies CountryRow;
    store.countries.set(id, rec);
  });

  await load('events', (row) => {
    const id = pick(row, 'id');
    if (!id) return;
    store.events.set(id, {
      id,
      name: pick(row, 'name'),
      rank: pickNum(row, 'rank'),
      format: pick(row, 'format'),
    });
  });

  await load('round_types', (row) => {
    const id = pick(row, 'id');
    if (!id) return;
    store.roundTypes.set(id, {
      id,
      rank: pickNum(row, 'rank'),
      name: pick(row, 'name'),
      final: pick(row, 'final'),
      cellName: pick(row, 'cellName'),
    });
  });

  await load('formats', (row) => {
    const id = pick(row, 'id');
    if (!id) return;
    store.formats.set(id, {
      id,
      name: pick(row, 'name'),
      rank: pickNum(row, 'rank'),
      expectedSolveCount: pickNum(row, 'expected_solve_count', 'expectedSolveCount'),
      trimFastestN: pickNum(row, 'trim_fastest_n', 'trimFastestN'),
      trimSlowestN: pickNum(row, 'trim_slowest_n', 'trimSlowestN'),
    });
  });

  await load('competitions', (row) => {
    const id = pick(row, 'id');
    if (!id) return;
    store.competitions.set(id, {
      id,
      name: pick(row, 'name'),
      cityName: pick(row, 'cityName', 'city_name'),
      countryId: pick(row, 'countryId', 'country_id'),
      information: pick(row, 'information'),
      year: pickNum(row, 'year'),
      month: pickNum(row, 'month'),
      day: pickNum(row, 'day'),
      endYear: pickNum(row, 'endYear', 'end_year'),
      endMonth: pickNum(row, 'endMonth', 'end_month'),
      endDay: pickNum(row, 'endDay', 'end_day'),
      cancelled: pick(row, 'cancelled'),
      cancelledReason: pick(row, 'cancelledReason', 'cancelled_reason'),
      delegates: pick(row, 'delegates'),
      organizers: pick(row, 'organizers', 'organisers'),
      venue: pick(row, 'venue'),
      venueAddress: pick(row, 'venueAddress', 'venue_address'),
      venueDetails: pick(row, 'venueDetails', 'venue_details'),
      externalWebsite: pick(row, 'externalWebsite', 'external_website'),
      latitudeMicrodegrees: pickNum(row, 'latitude_microdegrees', 'latitudeMicrodegrees', 'latitude'),
      longitudeMicrodegrees: pickNum(row, 'longitude_microdegrees', 'longitudeMicrodegrees', 'longitude'),
    } satisfies CompetitionRow);
  });

  await load('championships', (row) => {
    const competitionId = pick(row, 'competition_id', 'competitionId');
    const championshipType = pick(row, 'championship_type', 'championshipType');
    if (!competitionId) return;
    store.championships.push({ competitionId, championshipType } satisfies ChampionshipRow);
  });

  await load('persons', (row) => {
    const wcaId = pick(row, 'wca_id', 'wcaId', 'id');
    if (!wcaId) return;
    store.persons.set(wcaId, {
      wcaId,
      subId: pickNum(row, 'sub_id', 'subId', 'subid') || 1,
      name: pick(row, 'name'),
      countryId: pick(row, 'country_id', 'countryId'),
      gender: pick(row, 'gender'),
      birthdate: pick(row, 'birthdate'),
    } satisfies PersonRow);
  });

  await load('results', (row) => {
    const personId = pick(row, 'person_id', 'personId');
    const competitionId = pick(row, 'competition_id', 'competitionId');
    if (!personId || !competitionId) return;
    store.results.push({
      id: pickNum(row, 'id'),
      personId,
      pos: pickNum(row, 'pos'),
      personName: pick(row, 'person_name', 'personName'),
      countryId: pick(row, 'country_id', 'countryId'),
      competitionId,
      eventId: pick(row, 'event_id', 'eventId'),
      roundTypeId: pick(row, 'round_type_id', 'roundTypeId'),
      formatId: pick(row, 'format_id', 'formatId'),
      regionalSingleRecord: pick(row, 'regional_single_record', 'regionalSingleRecord'),
      regionalAverageRecord: pick(row, 'regional_average_record', 'regionalAverageRecord'),
      best: pickNum(row, 'best'),
      average: pickNum(row, 'average'),
    } satisfies ResultRow);
  });

  await load('result_attempts', (row) => {
    const resultId = pickNum(row, 'result_id', 'resultId');
    const attemptNumber = pickNum(row, 'attempt_number', 'attemptNumber');
    const value = pickNum(row, 'value');
    const arr = store.attempts.get(resultId) ?? [];
    arr[attemptNumber - 1] = value;
    store.attempts.set(resultId, arr);
  });

  const loadRanks = async (name: 'ranks_single' | 'ranks_average') => {
    const file = tables.get(name);
    if (!file) return;
    log(`  load ${name}`);
    const rows: RankRow[] = [];
    for await (const row of iterateTsvRows(file)) {
      rows.push({
        personId: pick(row, 'person_id', 'personId'),
        eventId: pick(row, 'event_id', 'eventId'),
        best: pickNum(row, 'best'),
        worldRank: pickNum(row, 'world_rank', 'worldRank'),
        continentRank: pickNum(row, 'continent_rank', 'continentRank'),
        countryRank: pickNum(row, 'country_rank', 'countryRank'),
      });
    }
    if (name === 'ranks_single') store.ranksSingle = rows;
    else store.ranksAverage = rows;
  };

  await loadRanks('ranks_single');
  await loadRanks('ranks_average');
}

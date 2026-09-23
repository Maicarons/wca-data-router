/**
 * Shared mapping helpers and path utilities tests.
 */
import { describe, expect, test } from 'bun:test';
import {
  classifyCompetitionToken,
  createOverview,
  paginate,
  slugify,
  staticPaths,
} from '@wca/shared';
import { parseTsvLine, rowToObject } from '../src/ingest/tsv';
import { MemoryStore, slug } from '../src/store/memory-store';
import { mapPerson, personSummary } from '../src/builders/mappers';

describe('overview', () => {
  test('paginates items', () => {
    const items = [1, 2, 3, 4, 5];
    const page2 = paginate(items, 2, 2);
    expect(page2.items).toEqual([3, 4]);
    expect(page2.total).toBe(5);
    expect(page2.pagination.page).toBe(2);
  });

  test('createOverview keeps total', () => {
    const o = createOverview(['a'], 10, { page: 1, size: 1 });
    expect(o.total).toBe(10);
  });
});

describe('paths', () => {
  test('person path', () => {
    expect(staticPaths.personById('2012PARK03')).toBe('persons/2012PARK03.json');
    expect(staticPaths.personShardById('2012PARK03')).toBe('persons/shard/20/2012PARK03.json');
  });

  test('rank path', () => {
    expect(staticPaths.rank('world', 'single', '333')).toBe('rank/world/single/333.json');
  });

  test('competition token classification', () => {
    const known = {
      countries: new Set(['BE', 'US']),
      events: new Set(['333', '222']),
    };
    expect(classifyCompetitionToken('2023', known)).toBe('year');
    expect(classifyCompetitionToken('BE', known)).toBe('country');
    expect(classifyCompetitionToken('333', known)).toBe('event');
    expect(classifyCompetitionToken('WC2023', known)).toBe('id');
  });
});

describe('slug', () => {
  test('slugify names', () => {
    expect(slugify('Europe')).toBe('europe');
    expect(slug('Péter Kis')).toBe('peter-kis');
  });
});

describe('tsv', () => {
  test('parses quoted fields', () => {
    expect(parseTsvLine('a\t"b\tc"\td')).toEqual(['a', 'b\tc', 'd']);
    const row = rowToObject(['id', 'name'], ['1', 'x']);
    expect(row.name).toBe('x');
  });
});

describe('person mapper', () => {
  test('builds summary and full person', () => {
    const store = new MemoryStore();
    store.continents.set('Europe', { id: 'Europe', name: 'Europe' });
    store.countries.set('Poland', { id: 'Poland', name: 'Poland', continentId: 'Europe', iso2: 'PL' });
    store.events.set('333', { id: '333', name: '3x3x3 Cube', rank: 1, format: 'time' });
    store.roundTypes.set('f', { id: 'f', rank: 1, name: 'Final', final: '1', cellName: 'Final' });
    store.formats.set('a', { id: 'a', name: 'Average of 5', rank: 1, expectedSolveCount: 5, trimFastestN: 1, trimSlowestN: 1 });
    store.competitions.set('Comp2024', {
      id: 'Comp2024',
      name: 'Comp 2024',
      cityName: 'Warsaw',
      countryId: 'Poland',
      information: '',
      year: 2024,
      month: 5,
      day: 1,
      endYear: 2024,
      endMonth: 5,
      endDay: 1,
      cancelled: '0',
      cancelledReason: '',
      delegates: '',
      organizers: '',
      venue: 'Hall',
      venueAddress: '',
      venueDetails: '',
      externalWebsite: '',
      latitudeMicrodegrees: 0,
      longitudeMicrodegrees: 0,
    });
    store.persons.set('2012TEST01', {
      wcaId: '2012TEST01',
      subId: 1,
      name: 'Test Person',
      countryId: 'Poland',
      gender: 'm',
      birthdate: '',
    });
    store.results.push({
      id: 1,
      personId: '2012TEST01',
      pos: 1,
      personName: 'Test Person',
      countryId: 'Poland',
      competitionId: 'Comp2024',
      eventId: '333',
      roundTypeId: 'f',
      formatId: 'a',
      regionalSingleRecord: 'NR',
      regionalAverageRecord: '',
      best: 500,
      average: 600,
    });
    store.attempts.set(1, [500, 550, 520, 610, 530]);
    store.ranksSingle.push({
      personId: '2012TEST01',
      eventId: '333',
      best: 500,
      worldRank: 10,
      continentRank: 5,
      countryRank: 2,
    });
    store.buildIndexes();

    const summary = personSummary(store, '2012TEST01');
    expect(summary?.medals.gold).toBe(1);
    expect(summary?.numberOfCompetitions).toBe(1);

    const person = mapPerson(store, '2012TEST01');
    expect(person?.rank.singles[0]?.rank.world).toBe(10);
    expect(person?.results.Comp2024?.['333']?.[0]?.solves).toEqual([500, 550, 520, 610, 530]);
    expect(person?.records.single.NR).toBe(1);
  });
});

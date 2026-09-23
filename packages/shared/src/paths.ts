/**
 * Static path mapping — single source of truth for builder emit and router resolve.
 * Layout is compatible with robiningelbrecht/wca-rest-api v1.
 */

export function joinJson(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${clean}.json`;
}

export const staticPaths = {
  version: () => joinJson('version'),
  manifest: () => joinJson('manifest'),
  continents: () => joinJson('continents'),
  countries: () => joinJson('countries'),
  events: () => joinJson('events'),

  competitions: () => joinJson('competitions'),
  competitionsPage: (page: number) =>
    page <= 1 ? joinJson('competitions') : joinJson(`competitions-page-${page}`),
  competitionById: (id: string) => joinJson(`competitions/${id}`),
  competitionsByCountry: (iso2: string) => joinJson(`competitions/${iso2}`),
  competitionsByYear: (year: number | string) => joinJson(`competitions/${year}`),
  competitionsByMonth: (year: number | string, month: string) =>
    joinJson(`competitions/${year}/${month}`),
  competitionsByDay: (year: number | string, month: string, day: string) =>
    joinJson(`competitions/${year}/${month}/${day}`),
  competitionsByEvent: (eventId: string, page = 1) =>
    page <= 1
      ? joinJson(`competitions/${eventId}`)
      : joinJson(`competitions/${eventId}-page-${page}`),

  championships: () => joinJson('championships'),
  championshipsPage: (page: number) =>
    page <= 1 ? joinJson('championships') : joinJson(`championships-page-${page}`),
  championshipById: (id: string) => joinJson(`championships/${id}`),
  championshipsByType: (type: string) => joinJson(`championships/${type}`),

  persons: () => joinJson('persons'),
  personsPage: (page: number) =>
    page <= 1 ? joinJson('persons') : joinJson(`persons-page-${page}`),
  personById: (id: string) => joinJson(`persons/${id}`),
  personResults: (id: string) => joinJson(`persons/${id}/results`),
  personShardById: (id: string) => {
    const prefix = id.slice(0, 2).toLowerCase();
    return joinJson(`persons/shard/${prefix}/${id}`);
  },

  rank: (region: string, type: string, eventId: string) =>
    joinJson(`rank/${region}/${type}/${eventId}`),

  resultsByCompetition: (competitionId: string) => joinJson(`results/${competitionId}`),
  resultsByCompetitionEvent: (competitionId: string, eventId: string) =>
    joinJson(`results/${competitionId}/${eventId}`),
} as const;

/** Resolve REST-ish route params to a static file path. */
export function resolveStaticForRoute(
  resource: string,
  params: Record<string, string>,
  opts?: { page?: number; personSharded?: boolean },
): string | null {
  const page = opts?.page ?? 1;
  switch (resource) {
    case 'version':
      return staticPaths.version();
    case 'manifest':
      return staticPaths.manifest();
    case 'continents':
      return staticPaths.continents();
    case 'countries':
      return staticPaths.countries();
    case 'events':
      return staticPaths.events();
    case 'competitions-list':
      return staticPaths.competitionsPage(page);
    case 'competition':
      return staticPaths.competitionById(params.id ?? '');
    case 'competitions-country':
      return staticPaths.competitionsByCountry(params.iso2 ?? '');
    case 'competitions-year':
      return staticPaths.competitionsByYear(params.year ?? '');
    case 'competitions-month':
      return staticPaths.competitionsByMonth(params.year ?? '', params.month ?? '');
    case 'competitions-day':
      return staticPaths.competitionsByDay(params.year ?? '', params.month ?? '', params.day ?? '');
    case 'competitions-event':
      return staticPaths.competitionsByEvent(params.eventId ?? '', page);
    case 'championships-list':
      return staticPaths.championshipsPage(page);
    case 'championship':
      return staticPaths.championshipById(params.id ?? '');
    case 'championships-type':
      return staticPaths.championshipsByType(params.type ?? '');
    case 'persons-list':
      return staticPaths.personsPage(page);
    case 'person':
      return opts?.personSharded
        ? staticPaths.personShardById(params.id ?? '')
        : staticPaths.personById(params.id ?? '');
    case 'person-results':
      return staticPaths.personResults(params.id ?? '');
    case 'rank':
      return staticPaths.rank(params.region ?? '', params.type ?? '', params.eventId ?? '');
    case 'results-competition':
      return staticPaths.resultsByCompetition(params.competitionId ?? '');
    case 'results-competition-event':
      return staticPaths.resultsByCompetitionEvent(
        params.competitionId ?? '',
        params.eventId ?? '',
      );
    default:
      return null;
  }
}

const YEAR_RE = /^\d{4}$/;
const MONTH_RE = /^\d{2}$/;
const DAY_RE = /^\d{2}$/;

/**
 * Disambiguate competitions/{token} which may be country, year, event, or id.
 */
export type CompetitionTokenKind = 'year' | 'country' | 'event' | 'id';

export function classifyCompetitionToken(
  token: string,
  known: { countries: Set<string>; events: Set<string> },
): CompetitionTokenKind {
  if (YEAR_RE.test(token)) return 'year';
  if (known.countries.has(token.toUpperCase()) || known.countries.has(token)) return 'country';
  if (known.events.has(token)) return 'event';
  return 'id';
}

export function isValidYearMonth(month: string): boolean {
  return MONTH_RE.test(month) && Number(month) >= 1 && Number(month) <= 12;
}

export function isValidYearDay(day: string): boolean {
  return DAY_RE.test(day) && Number(day) >= 1 && Number(day) <= 31;
}

export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

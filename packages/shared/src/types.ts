/** Shared domain types for static API and router. */

export type RankType = 'single' | 'average';

export interface Pagination {
  page: number;
  size: number;
}

export interface Overview<T> {
  pagination: Pagination;
  total: number;
  items: T[];
}

export interface Continent {
  id: string;
  name: string;
}

export interface Country {
  iso2Code: string;
  name: string;
}

export interface EventItem {
  id: string;
  name: string;
  format: string;
}

export interface CompetitionDate {
  from: string;
  till: string;
  numberOfDays: number;
}

export interface Venue {
  name: string;
  address?: string | null;
  details?: string | null;
  coordinates?: {
    latitude: number;
    longitude: number;
  } | null;
}

export interface PersonRef {
  name: string;
  email?: string | null;
}

export interface Competition {
  id: string;
  name: string;
  city: string;
  country: string;
  date: CompetitionDate;
  isCanceled: boolean;
  events: string[];
  wcaDelegates: PersonRef[];
  organisers: PersonRef[];
  venue: Venue;
  information?: string | null;
  externalWebsite?: string | null;
}

export interface Championship extends Competition {
  region: string;
}

export interface PersonRankEntry {
  eventId: string;
  best: number;
  rank: {
    world: number;
    continent: number;
    country: number;
  };
}

export interface PersonSummary {
  id: string;
  name: string;
  slug: string;
  country: string;
  numberOfCompetitions: number;
  numberOfChampionships: number;
  medals: {
    gold: number;
    silver: number;
    bronze: number;
  };
}

export interface Person extends PersonSummary {
  competitionIds: string[];
  championshipIds: string[];
  rank: {
    singles: PersonRankEntry[];
    averages: PersonRankEntry[];
  };
  records: {
    single: Record<string, number>;
    average: Record<string, number>;
  };
  results: Record<string, Record<string, PersonResultEntry[]>>;
}

export interface PersonResultEntry {
  round: string;
  position: number;
  best: number;
  average: number;
  format: string;
  solves: number[];
}

export interface Rank {
  rankType: RankType;
  personId: string;
  eventId: string;
  best: number;
  rank: {
    world: number;
    continent: number;
    country: number;
  };
}

export interface ResultItem {
  competitionId: string;
  personId: string;
  eventId: string;
  round: string;
  position: number;
  best: number;
  average: number;
  format: string;
  solves: number[];
}

export interface VersionInfo {
  export_date: string;
  export_format_version: string;
  sql_url?: string;
  tsv_url?: string;
  generated_at?: string;
  attribution: string;
}

export interface Manifest {
  generated_at: string;
  export_date: string;
  export_format_version: string;
  resources: Record<string, number>;
  person_layout: 'flat' | 'sharded';
}

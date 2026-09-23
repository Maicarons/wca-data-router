export const TSV_TABLES = [
  'continents',
  'countries',
  'events',
  'competitions',
  'championships',
  'persons',
  'results',
  'result_attempts',
  'ranks_single',
  'ranks_average',
  'round_types',
  'formats',
] as const;

export type TsvTable = (typeof TSV_TABLES)[number];

/** Normalize export header names to camel/snake keys we use. */
export function normalizeHeader(header: string): string {
  return header.trim().replace(/^"|"$/g, '');
}

export function parseTsvLine(line: string): string[] {
  // WCA TSV is tab-separated; fields may be quoted with "
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === '\t') {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function rowToObject(headers: string[], cells: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    obj[headers[i] ?? `col${i}`] = cells[i] ?? '';
  }
  return obj;
}

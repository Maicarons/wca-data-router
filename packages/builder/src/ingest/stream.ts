// Prefer Bun streaming read of a .tsv file
export async function* iterateTsvRows(
  filePath: string,
): AsyncGenerator<Record<string, string>> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    throw new Error(`TSV file not found: ${filePath}`);
  }

  const stream = file.stream();
  const decoder = new TextDecoder();
  let buffer = '';
  let headers: string[] | null = null;

  const handleLine = (line: string): Record<string, string> | null => {
    if (!line || line === '\r') return null;
    if (!headers) {
      headers = line.replace(/\r$/, '').split('\t').map((h) => h.replace(/^"|"$/g, ''));
      return null;
    }
    const cells = line.replace(/\r$/, '').split('\t');
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] ?? `col${i}`;
      let val = cells[i] ?? '';
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      obj[key] = val;
    }
    return obj;
  };

  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx = buffer.indexOf('\n');
    while (idx >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      const row = handleLine(line);
      if (row) yield row;
      idx = buffer.indexOf('\n');
    }
  }
  buffer += decoder.decode();
  if (buffer.length > 0) {
    const row = handleLine(buffer);
    if (row) yield row;
  }
}

export function toInt(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === '') return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

export function toNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function isEmpty(value: string | undefined): boolean {
  return value === undefined || value === '';
}

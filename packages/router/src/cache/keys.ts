export function cacheKey(...parts: Array<string | number | undefined | null>): string {
  return parts.map((p) => String(p ?? '')).join('|');
}

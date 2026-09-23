import type { Overview, Pagination } from './types';

export const DEFAULT_PAGE_SIZE = 1000;

export function createPagination(page = 1, size = DEFAULT_PAGE_SIZE): Pagination {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeSize = Math.max(1, Math.floor(size) || DEFAULT_PAGE_SIZE);
  return { page: safePage, size: safeSize };
}

export function createOverview<T>(items: T[], total: number, pagination: Pagination): Overview<T> {
  return {
    pagination: {
      page: pagination.page,
      size: pagination.size === items.length ? items.length : pagination.size,
    },
    total,
    items,
  };
}

export function paginate<T>(items: T[], page = 1, size = DEFAULT_PAGE_SIZE): Overview<T> {
  const pagination = createPagination(page, size);
  const start = (pagination.page - 1) * pagination.size;
  const slice = items.slice(start, start + pagination.size);
  return createOverview(slice, items.length, {
    page: pagination.page,
    size: slice.length === pagination.size ? pagination.size : slice.length || pagination.size,
  });
}

/** Overview used for a complete single-file collection (no further pages). */
export function overviewAll<T>(items: T[]): Overview<T> {
  return {
    pagination: { page: 1, size: items.length || 1 },
    total: items.length,
    items,
  };
}

export function chunkPages<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE): T[][] {
  if (items.length === 0) return [[]];
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += pageSize) {
    pages.push(items.slice(i, i + pageSize));
  }
  return pages;
}

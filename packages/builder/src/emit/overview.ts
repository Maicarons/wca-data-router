import {
  chunkPages,
  createOverview,
  overviewAll,
  type Overview,
  type Pagination,
} from '@wca/shared';

export function pagesOf<T>(
  items: T[],
  pageSize: number,
  emit: (overview: Overview<T>, page: number) => void,
): void {
  const pages = chunkPages(items, pageSize);
  pages.forEach((pageItems, idx) => {
    const page = idx + 1;
    const pagination: Pagination = {
      page,
      size: pageItems.length || pageSize,
    };
    emit(createOverview(pageItems, items.length, pagination), page);
  });
  if (items.length === 0) {
    emit(createOverview([], 0, { page: 1, size: pageSize }), 1);
  }
}

export function fullOverview<T>(items: T[]): Overview<T> {
  return overviewAll(items);
}

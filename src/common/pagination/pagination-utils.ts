import { DEFAULT_PAGINATION_LIMIT_PER_PAGE, MAXIMUM_LIMIT_PER_PAGE } from "@/common/pagination";

export function resolvePaginationOffset({
  page = 1,
  limit = DEFAULT_PAGINATION_LIMIT_PER_PAGE,
}: {
  page?: number;
  limit?: number;
}) {
  const resolvedPage = Math.max(1, page);
  const resolvedLimit = Math.max(1, Math.min(MAXIMUM_LIMIT_PER_PAGE, limit));
  const offset = (resolvedPage - 1) * resolvedLimit;
  return { offset, resolvedPage, resolvedLimit };
}

export default {
  resolveOffset: resolvePaginationOffset,
};

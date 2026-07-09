import { Category, TransactionFilters, TransactionType } from "@/types"

export interface TransactionsDeepLinkFilter {
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  type?: TransactionType
}

// Builds a /transactions URL carrying a subset of TransactionFilters as query
// params, using the exact same field names so Transactions can parse them
// directly. URLSearchParams handles encoding safely.
export function buildTransactionsDeepLink(filter: TransactionsDeepLinkFilter): string {
  const params = new URLSearchParams()
  if (filter.categoryId) params.set("categoryId", filter.categoryId)
  if (filter.dateFrom) params.set("dateFrom", filter.dateFrom)
  if (filter.dateTo) params.set("dateTo", filter.dateTo)
  if (filter.type) params.set("type", filter.type)
  const query = params.toString()
  return query ? `/transactions?${query}` : "/transactions"
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Parses only the supported deep-link params, validating each independently
// and silently dropping anything malformed or unknown. `categoryId` must
// match an actually-loaded category so a stale/tampered id never filters to
// an impossible state.
export function parseTransactionsDeepLink(
  searchParams: URLSearchParams,
  categories: Category[]
): TransactionFilters {
  const filters: TransactionFilters = {}

  const categoryId = searchParams.get("categoryId")
  if (categoryId && categories.some((c) => c.id === categoryId)) {
    filters.categoryId = categoryId
  }

  const type = searchParams.get("type")
  if (type === "income" || type === "expense") {
    filters.type = type
  }

  const dateFrom = searchParams.get("dateFrom")
  if (dateFrom && DATE_RE.test(dateFrom)) {
    filters.dateFrom = dateFrom
  }

  const dateTo = searchParams.get("dateTo")
  if (dateTo && DATE_RE.test(dateTo)) {
    filters.dateTo = dateTo
  }

  return filters
}

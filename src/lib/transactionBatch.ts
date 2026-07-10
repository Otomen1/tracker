import { Transaction, TransactionType } from "@/types"

// Pure batch-mutation helpers, kept outside the hook so they're directly
// unit-testable without rendering anything. Each takes the full transaction
// array and returns a new array in one pass - the hook wraps these in a
// single setTransactions call, so a batch of any size is one storage write.

export function applyBulkDelete(
  transactions: Transaction[],
  ids: string[],
  cascade: boolean
): Transaction[] {
  if (ids.length === 0) return transactions
  const idSet = new Set(ids)
  if (!cascade) return transactions.filter((t) => !idSet.has(t.id))
  return transactions.filter(
    (t) => !idSet.has(t.id) && !(t.recurringId && idSet.has(t.recurringId))
  )
}

export function applyBulkRestore(
  transactions: Transaction[],
  items: Transaction[]
): Transaction[] {
  if (items.length === 0) return transactions
  // Idempotent: if some or all of these ids are already present (e.g. undo
  // triggered twice), only restore the ones actually missing.
  const existingIds = new Set(transactions.map((t) => t.id))
  const toRestore = items.filter((t) => !existingIds.has(t.id))
  if (toRestore.length === 0) return transactions
  return [...toRestore, ...transactions]
}

export function applyBulkRecategorize(
  transactions: Transaction[],
  ids: string[],
  categoryId: string,
  now: string
): Transaction[] {
  if (ids.length === 0) return transactions
  const idSet = new Set(ids)
  return transactions.map((t) =>
    idSet.has(t.id) ? { ...t, categoryId, updatedAt: now } : t
  )
}

// Selection is temporary UI state keyed by id. When the filtered result set
// changes (a filter changed, or a mutation removed/recategorized rows out of
// view), drop any selected id that's no longer visible so a bulk action can
// never reach a transaction the user can't currently see. Returns the same
// Set reference when nothing changed, so callers can skip a re-render.
export function reconcileSelection(
  selected: Set<string>,
  visibleIds: Iterable<string>
): Set<string> {
  if (selected.size === 0) return selected
  const visible = new Set(visibleIds)
  let changed = false
  const next = new Set<string>()
  selected.forEach((id) => {
    if (visible.has(id)) next.add(id)
    else changed = true
  })
  return changed ? next : selected
}

export interface SelectionTypeState {
  isMixed: boolean
  commonType: TransactionType | null
}

// Determines whether the current selection spans both income and expense
// transactions (in which case no single category is valid for the whole
// batch) or is homogeneous (in which case recategorize can offer that type's
// categories). Exits early once both types are seen - avoids a full O(n)
// scan in the common case with large selections.
export function getSelectionTypeState(
  transactions: Pick<Transaction, "id" | "type">[],
  selected: Set<string>
): SelectionTypeState {
  let sawIncome = false
  let sawExpense = false
  for (const t of transactions) {
    if (!selected.has(t.id)) continue
    if (t.type === "income") sawIncome = true
    else sawExpense = true
    if (sawIncome && sawExpense) return { isMixed: true, commonType: null }
  }
  if (sawIncome) return { isMixed: false, commonType: "income" }
  if (sawExpense) return { isMixed: false, commonType: "expense" }
  return { isMixed: false, commonType: null }
}

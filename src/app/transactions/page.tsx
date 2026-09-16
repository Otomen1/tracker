"use client"

import { Suspense, useCallback, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useBudgetCheck } from "@/hooks/useBudgetCheck"
import { filterTransactions, getSortedTransactions } from "@/lib/analytics"
import { parseTransactionsDeepLink } from "@/lib/deepLinks"
import { Transaction, TransactionFilters, TransactionFormData } from "@/types"
import { useSettingsContext } from "@/context/SettingsContext"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, ChevronDown } from "lucide-react"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { TransactionFiltersBar } from "@/components/transactions/TransactionFilters"
import { TransactionList } from "@/components/transactions/TransactionList"
import { ExportButton } from "@/components/transactions/ExportButton"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { useToast } from "@/context/ToastContext"
import { PageHeader } from "@/components/layout/PageHeader"

function TransactionsPageContent() {
  const searchParams = useSearchParams()
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteWithCascade,
    restoreTransaction,
    bulkDeleteTransactions,
    bulkRestoreTransactions,
    bulkRecategorize,
  } = useTransactions()
  const { categories } = useCategories()
  const { fmt, settings } = useSettingsContext()
  const { checkBudget, checkBudgetForCategory } = useBudgetCheck()
  const { showToast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  // Seeded once from any supported deep-link params on initial load only;
  // manual filtering afterward behaves exactly as before, with no ongoing
  // URL sync.
  const [filters, setFilters] = useState<TransactionFilters>(
    () => parseTransactionsDeepLink(searchParams, categories)
  )
  const [recurringOpen, setRecurringOpen] = useState(false)

  const sorted = useMemo(() => getSortedTransactions(transactions), [transactions])
  const filtered = useMemo(() => filterTransactions(sorted, filters), [sorted, filters])
  const recurringTemplates = useMemo(() => sorted.filter((t) => t.isRecurring), [sorted])
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    sorted.forEach((t) => t.tags?.forEach((tag) => set.add(tag)))
    return Array.from(set).sort()
  }, [sorted])

  const handleAdd = useCallback((data: TransactionFormData) => {
    if (!addTransaction(data)) {
      showToast("Transaction could not be saved. Check browser storage and try again.", "error")
      return false
    }
    setAddOpen(false)
    showToast("Transaction added", "success")
    checkBudget(data, transactions)
    return true
  }, [addTransaction, showToast, checkBudget, transactions])

  const handleUpdate = useCallback((id: string, data: TransactionFormData) => {
    if (!updateTransaction(id, data)) {
      showToast("Changes could not be saved. Check browser storage and try again.", "error")
      return false
    }
    showToast("Changes saved", "success")
    checkBudget(data, transactions.filter((t) => t.id !== id))
    return true
  }, [updateTransaction, showToast, checkBudget, transactions])

  const handleDelete = (id: string, cascade: boolean) => {
    const saved = cascade ? deleteWithCascade(id) : deleteTransaction(id)
    if (!saved) showToast("Transaction could not be deleted. Your data was kept.", "error")
    else showToast("Transaction deleted", "success")
    return saved
  }

  const handleBulkDelete = useCallback((ids: string[], cascade: boolean) => {
    const saved = bulkDeleteTransactions(ids, cascade)
    if (!saved) showToast("Transactions could not be deleted. Your data was kept.", "error")
    else showToast(`${ids.length} transaction${ids.length === 1 ? "" : "s"} deleted`, "success")
    return saved
  }, [bulkDeleteTransactions, showToast])

  const handleBulkRestore = useCallback((items: Transaction[]) => {
    const saved = bulkRestoreTransactions(items)
    if (!saved) showToast("Transactions could not be restored.", "error")
    else showToast(`${items.length} transaction${items.length === 1 ? "" : "s"} restored`, "success")
    return saved
  }, [bulkRestoreTransactions, showToast])

  const handleBulkRecategorize = useCallback((ids: string[], categoryId: string) => {
    if (!bulkRecategorize(ids, categoryId)) {
      showToast("Transactions could not be recategorized.", "error")
      return false
    }
    showToast(`${ids.length} transaction${ids.length !== 1 ? "s" : ""} recategorized`, "success")
    // Budget check needs the resulting state, not the pre-mutation snapshot
    // still in `transactions` on this render - compute it directly rather
    // than waiting a render for the hook to catch up.
    const idSet = new Set(ids)
    const resulting = transactions.map((t) => (idSet.has(t.id) ? { ...t, categoryId } : t))
    checkBudgetForCategory(categoryId, resulting)
    return true
  }, [bulkRecategorize, showToast, transactions, checkBudgetForCategory])

  return (
    <div className="space-y-5">
      <PageHeader title="Transactions" description="Search, review, and manage your financial activity" action={<Button size="sm" className="hidden gap-1.5 lg:inline-flex" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>} />

      {recurringTemplates.length > 0 && (
        <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
            onClick={() => setRecurringOpen((o) => !o)}
            aria-expanded={recurringOpen}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-zinc-400" />
              Recurring Templates
              <span className="text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full">{recurringTemplates.length}</span>
            </span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", recurringOpen && "rotate-180")} />
          </button>
          {recurringOpen && (
            <div className="px-4 pb-4 space-y-2">
              {recurringTemplates.map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId)
                return (
                  <div key={t.id} className="flex items-center justify-between py-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat?.color ?? "#6b7280" }} />
                      <div>
                        <p className="text-sm text-zinc-900 dark:text-zinc-100">{t.description}</p>
                        <p className="text-xs text-zinc-400">{cat?.name} · Monthly on day {t.recurringDay ?? "?"} · Since {formatDate(t.date)}</p>
                      </div>
                    </div>
                    <span className={cn("text-sm font-medium", t.type === "income" ? "text-emerald-600" : "text-rose-500")}>
                      {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <TransactionFiltersBar
            filters={filters}
            categories={categories}
            tags={allTags}
            fmt={fmt}
            onChange={setFilters}
            onClearAll={() => showToast("Filters cleared", "success")}
          />
          <ExportButton
            allTransactions={transactions}
            transactions={filtered}
            categories={categories}
            currency={settings.currency}
          />
        </div>

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== transactions.length && ` (filtered from ${transactions.length})`}
          </span>
        </div>

        <TransactionList
          transactions={filtered}
          categories={categories}
          filterKey={filterKey}
          onRestore={restoreTransaction}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onBulkRestore={handleBulkRestore}
          onBulkRecategorize={handleBulkRecategorize}
          hasTransactions={transactions.length > 0}
          onAddTransaction={() => setAddOpen(true)}
        />
      </div>

      <TransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        onSubmit={handleAdd}
      />
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div role="status" className="rounded-xl border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">Loading transactions…</div>}>
      <TransactionsPageContent />
    </Suspense>
  )
}

"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { filterTransactions, getSortedTransactions } from "@/lib/analytics"
import { TransactionFilters, TransactionFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, ChevronDown, CheckCircle } from "lucide-react"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { TransactionFiltersBar } from "@/components/transactions/TransactionFilters"
import { TransactionList } from "@/components/transactions/TransactionList"
import { ExportButton } from "@/components/transactions/ExportButton"
import { useSettingsContext } from "@/context/SettingsContext"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions()
  const { categories } = useCategories()
  const { fmt } = useSettingsContext()
  const [addOpen, setAddOpen] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [recurringOpen, setRecurringOpen] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sorted = useMemo(() => getSortedTransactions(transactions), [transactions])
  const filtered = useMemo(() => filterTransactions(sorted, filters), [sorted, filters])
  const recurringTemplates = useMemo(() => sorted.filter((t) => t.isRecurring), [sorted])
  const filterKey = useMemo(() => JSON.stringify(filters), [filters])

  const allTags = useMemo(() => {
    const set = new Set<string>()
    sorted.forEach((t) => t.tags?.forEach((tag) => set.add(tag)))
    return Array.from(set).sort()
  }, [sorted])

  const showSuccess = useCallback((msg: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    setSuccessMessage(msg)
    successTimerRef.current = setTimeout(() => setSuccessMessage(null), 3000)
  }, [])

  const handleAdd = useCallback((data: TransactionFormData) => {
    addTransaction(data)
    setAddOpen(false)
    showSuccess("Transaction added")
  }, [addTransaction, showSuccess])

  const handleUpdate = useCallback((id: string, data: TransactionFormData) => {
    updateTransaction(id, data)
    showSuccess("Changes saved")
  }, [updateTransaction, showSuccess])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Transactions</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm"
        >
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successMessage}
        </div>
      )}

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

      <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TransactionFiltersBar
            filters={filters}
            categories={categories}
            tags={allTags}
            onChange={setFilters}
          />
          <ExportButton
            transactions={filtered}
            categories={categories}
          />
        </div>

        <div className="text-xs text-zinc-400">
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== transactions.length && ` (filtered from ${transactions.length})`}
        </div>

        <TransactionList
          transactions={filtered}
          categories={categories}
          filterKey={filterKey}
          onAdd={handleAdd}
          onUpdate={handleUpdate}
          onDelete={deleteTransaction}
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

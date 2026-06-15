"use client"

import { useMemo, useState } from "react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { filterTransactions, getSortedTransactions } from "@/lib/analytics"
import { TransactionFilters } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { TransactionFiltersBar } from "@/components/transactions/TransactionFilters"
import { TransactionList } from "@/components/transactions/TransactionList"
import { ExportButton } from "@/components/transactions/ExportButton"

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions()
  const { categories } = useCategories()
  const [addOpen, setAddOpen] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>({})

  const sorted = getSortedTransactions(transactions)
  const filtered = filterTransactions(sorted, filters)

  const allTags = useMemo(() => {
    const set = new Set<string>()
    sorted.forEach((t) => t.tags?.forEach((tag) => set.add(tag)))
    return Array.from(set).sort()
  }, [sorted])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Transactions</h1>
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          Add Transaction
        </Button>
      </div>

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
          onUpdate={updateTransaction}
          onDelete={deleteTransaction}
        />
      </div>

      <TransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        onSubmit={addTransaction}
      />
    </div>
  )
}

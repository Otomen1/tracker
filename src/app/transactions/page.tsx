"use client"

import { useState } from "react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { filterTransactions, getSortedTransactions, getBudgetStatus } from "@/lib/analytics"
import { Transaction, TransactionFilters, TransactionFormData } from "@/types"
import { getMonthKey } from "@/lib/formatters"
import { useSettingsContext } from "@/context/SettingsContext"
import { useToast } from "@/context/ToastContext"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { TransactionFiltersBar } from "@/components/transactions/TransactionFilters"
import { TransactionList } from "@/components/transactions/TransactionList"
import { ExportButton } from "@/components/transactions/ExportButton"

export default function TransactionsPage() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, deleteWithCascade } = useTransactions()
  const { categories } = useCategories()
  const { fmt, settings } = useSettingsContext()
  const { showToast } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>({})

  const sorted = getSortedTransactions(transactions)
  const filtered = filterTransactions(sorted, filters)

  const checkBudget = (data: TransactionFormData, baseTransactions: Transaction[]) => {
    const currentMonth = getMonthKey()
    if (data.type !== "expense" || !data.date.startsWith(currentMonth)) return

    const hypothetical: Transaction[] = [
      ...baseTransactions,
      {
        id: "_budget_check",
        type: data.type,
        amount: parseFloat(data.amount),
        categoryId: data.categoryId,
        description: data.description,
        date: data.date,
        createdAt: "",
        updatedAt: "",
      },
    ]

    const budgets = getBudgetStatus(hypothetical, currentMonth, categories)
    const b = budgets.find((b) => b.categoryId === data.categoryId)
    if (!b) return

    if (b.isOverBudget) {
      showToast(
        `${b.categoryName} is over budget — ${fmt(b.spent)} of ${fmt(b.budget)} spent`,
        "error"
      )
    } else if (b.percentage >= 80) {
      showToast(
        `${b.categoryName} is at ${Math.round(b.percentage)}% of budget`,
        "warning"
      )
    }
  }

  const handleAdd = (data: TransactionFormData) => {
    addTransaction(data)
    checkBudget(data, transactions)
  }

  const handleUpdate = (id: string, data: TransactionFormData) => {
    updateTransaction(id, data)
    checkBudget(data, transactions.filter((t) => t.id !== id))
  }

  const handleDelete = (id: string, cascade: boolean) => {
    if (cascade) deleteWithCascade(id)
    else deleteTransaction(id)
  }

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
            onChange={setFilters}
          />
          <ExportButton
                allTransactions={transactions}
                transactions={filtered}
                categories={categories}
                currency={settings.currency}
              />
        </div>

        <div className="text-xs text-zinc-400">
          {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== transactions.length && ` (filtered from ${transactions.length})`}
        </div>

        <TransactionList
          transactions={filtered}
          categories={categories}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
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

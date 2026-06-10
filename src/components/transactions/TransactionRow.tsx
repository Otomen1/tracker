"use client"

import { useState } from "react"
import { Transaction, Category, TransactionFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/formatters"
import { useSettingsContext } from "@/context/SettingsContext"
import { TransactionDialog } from "./TransactionDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { cn } from "@/lib/utils"

interface Props {
  transaction: Transaction
  categories: Category[]
  onUpdate: (id: string, data: TransactionFormData) => void
  onDelete: (id: string, cascade: boolean) => void
  recurringInstanceCount?: number
}

export function TransactionRow({ transaction, categories, onUpdate, onDelete, recurringInstanceCount = 0 }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const { fmt } = useSettingsContext()
  const category = categories.find((c) => c.id === transaction.categoryId)

  return (
    <>
      <tr className="group border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
        <td className="py-3 px-4 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
          {formatDate(transaction.date)}
        </td>
        <td className="py-3 px-4 max-w-[200px]">
          <div>
            <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{transaction.description}</p>
            {transaction.notes && (
              <p className="text-xs text-zinc-400 truncate mt-0.5">{transaction.notes}</p>
            )}
            {transaction.tags && transaction.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {transaction.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            {category && (
              <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                {category.name}
              </span>
            )}
            {transaction.isRecurring && (
              <span title="Recurring monthly"><RefreshCw className="w-3 h-3 text-zinc-400" /></span>
            )}
            {transaction.recurringId && (
              <span title="Auto-generated"><RefreshCw className="w-3 h-3 text-zinc-300" /></span>
            )}
          </div>
        </td>
        <td className="py-3 px-4 text-sm hidden sm:table-cell">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full font-medium",
            transaction.type === "income"
              ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
              : "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
          )}>
            {transaction.type === "income" ? "Income" : "Expense"}
          </span>
        </td>
        <td className={cn(
          "py-3 px-4 text-sm font-medium text-right whitespace-nowrap",
          transaction.type === "income" ? "text-emerald-600" : "text-rose-500"
        )}>
          {transaction.type === "income" ? "+" : "-"}{fmt(transaction.amount)}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit transaction" onClick={() => setEditOpen(true)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon" variant="ghost"
              className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              aria-label="Delete transaction"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </td>
      </tr>

      <TransactionDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        transaction={transaction}
        categories={categories}
        onSubmit={(data) => onUpdate(transaction.id, data)}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        description="Are you sure you want to delete this transaction? This cannot be undone."
        cascadeCount={transaction.isRecurring ? recurringInstanceCount : undefined}
        onConfirm={(cascade) => onDelete(transaction.id, cascade)}
      />
    </>
  )
}

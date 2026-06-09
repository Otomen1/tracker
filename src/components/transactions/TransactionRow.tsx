"use client"

import { useState } from "react"
import { Transaction, Category } from "@/types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { TransactionDialog } from "./TransactionDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { TransactionFormData } from "@/types"
import { cn } from "@/lib/utils"

interface Props {
  transaction: Transaction
  categories: Category[]
  onUpdate: (id: string, data: TransactionFormData) => void
  onDelete: (id: string) => void
}

export function TransactionRow({ transaction, categories, onUpdate, onDelete }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const category = categories.find((c) => c.id === transaction.categoryId)

  return (
    <>
      <tr className="group border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
        <td className="py-3 px-4 text-sm text-zinc-500 whitespace-nowrap">
          {formatDate(transaction.date)}
        </td>
        <td className="py-3 px-4 text-sm text-zinc-900 max-w-[200px] truncate">
          {transaction.description}
        </td>
        <td className="py-3 px-4">
          {category && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-700">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </span>
          )}
        </td>
        <td className="py-3 px-4 text-sm hidden sm:table-cell">
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              transaction.type === "income"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-600"
            )}
          >
            {transaction.type === "income" ? "Income" : "Expense"}
          </span>
        </td>
        <td
          className={cn(
            "py-3 px-4 text-sm font-medium text-right whitespace-nowrap",
            transaction.type === "income" ? "text-emerald-600" : "text-rose-500"
          )}
        >
          {transaction.type === "income" ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
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
        onConfirm={() => onDelete(transaction.id)}
      />
    </>
  )
}

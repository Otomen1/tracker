"use client"

import { Transaction, Category } from "@/types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, RefreshCw } from "lucide-react"
import { formatDate } from "@/lib/formatters"
import { useSettingsContext } from "@/context/SettingsContext"
import { cn } from "@/lib/utils"

interface Props {
  transaction: Transaction
  categories: Category[]
  onEditRequest: (t: Transaction) => void
  onDeleteRequest: (t: Transaction) => void
  recurringInstanceCount?: number
  selectMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

export function TransactionRow({
  transaction,
  categories,
  onEditRequest,
  onDeleteRequest,
  recurringInstanceCount = 0,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: Props) {
  const { fmt } = useSettingsContext()
  const category = categories.find((c) => c.id === transaction.categoryId)

  return (
    <tr className={cn(
      "group border-b border-zinc-100 outline-none last:border-b-0 hover:bg-zinc-50 focus-within:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 dark:focus-within:bg-zinc-800/50 transition-colors",
      selected && "bg-zinc-50 dark:bg-zinc-800/50"
    )}>
      {selectMode && (
        <td className="py-3 pl-4 pr-1 w-10">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(transaction.id)}
            aria-label={`Select ${transaction.description}`}
            className="rounded border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-zinc-100"
          />
        </td>
      )}
      <td className="hidden py-2.5 px-4 text-sm text-zinc-500 dark:text-zinc-400 whitespace-nowrap sm:table-cell">
        {formatDate(transaction.date)}
      </td>
      <td className="py-3 px-4 max-w-[200px] sm:py-2.5">
        <div>
          <p className="text-sm text-zinc-900 dark:text-zinc-100 truncate">{transaction.description}</p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:hidden">{transaction.type === "transfer" ? "Internal transfer" : category?.name ?? "Uncategorized"} · {formatDate(transaction.date)}</p>
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
      <td className="hidden py-2.5 px-4 sm:table-cell">
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
      <td className="hidden py-2.5 px-4 text-sm sm:table-cell">
        <span className={cn(
          "text-xs px-2 py-0.5 rounded-full font-medium",
          transaction.type === "income"
            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400"
            : transaction.type === "expense" ? "bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        )}>
          {transaction.type === "income" ? "Income" : transaction.type === "expense" ? "Expense" : "Transfer"}
        </span>
      </td>
      <td className={cn(
        "py-3 px-2 font-mono text-sm font-semibold tabular-nums text-right whitespace-nowrap sm:px-4 sm:py-2.5",
        transaction.type === "income" ? "text-emerald-600" : transaction.type === "expense" ? "text-rose-500" : "text-zinc-600 dark:text-zinc-300"
      )}>
        {transaction.type === "income" ? "+" : transaction.type === "expense" ? "-" : ""}{fmt(transaction.amount)}
      </td>
      <td className="py-2.5 pl-1 pr-2 text-right sm:px-4">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 group-focus-within:opacity-100 transition-opacity">
          {transaction.type !== "transfer" && <Button
            size="icon" variant="ghost" className="h-10 w-10 sm:h-8 sm:w-8"
            aria-label={`Edit ${transaction.description}`}
            onClick={() => onEditRequest(transaction)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>}
          <Button
            size="icon" variant="ghost"
            className="h-10 w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 sm:h-8 sm:w-8"
            aria-label={`Delete ${transaction.description}`}
            onClick={() => onDeleteRequest(transaction)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  )
}

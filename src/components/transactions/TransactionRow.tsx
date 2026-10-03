"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAccounts } from "@/context/AccountsContext"
import { Transaction, Category } from "@/types"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
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
  const [detailOpen, setDetailOpen] = useState(false)
  const { accounts } = useAccounts()
  const accountName = (id?: string) => accounts.find(a => a.id === id)?.name ?? "Unassigned"
  const { fmt } = useSettingsContext()
  const category = categories.find((c) => c.id === transaction.categoryId)

  return (
    <tr onClick={event => {
      if (!event.currentTarget.contains(event.target as Node)) return
      if ((event.target as Element).closest("button, input, a, [role=dialog]")) return
      if (selectMode) onToggleSelect?.(transaction.id)
      else setDetailOpen(true)
    }} className={cn(
      "cursor-pointer group border-b border-zinc-100 outline-none last:border-b-0 hover:bg-zinc-50 focus-within:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50 dark:focus-within:bg-zinc-800/50 transition-colors",
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
      <td className="py-3 px-4 max-w-[200px] break-words sm:py-2.5">
        <div>
          <button className="min-h-12 max-w-full text-left text-sm text-zinc-900 dark:text-zinc-100" onClick={() => selectMode ? onToggleSelect?.(transaction.id) : setDetailOpen(true)} aria-label={`Details for ${transaction.description}`}>{transaction.description}</button>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400 sm:hidden">{transaction.type === "transfer" ? "Transfer" : transaction.type === "income" ? "Money in" : "Money out"} · {category?.name ?? "Uncategorized"} · {formatDate(transaction.date)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{transaction.type === "transfer" ? `${accountName(transaction.fromAccountId)} → ${accountName(transaction.toAccountId)}` : accountName(transaction.accountId)}</p>
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
      <td className="p-0 w-0">
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-h-[85dvh] overflow-y-auto rounded-xl">
            <DialogHeader><DialogTitle>{transaction.description}</DialogTitle><DialogDescription>Transaction details</DialogDescription></DialogHeader>
            <dl className="space-y-2 text-left text-sm">
              <div><dt className="text-muted-foreground">Amount / type</dt><dd>{fmt(transaction.amount)} · {transaction.isRefund ? "Card refund" : transaction.type}</dd></div>
              <div><dt className="text-muted-foreground">Date</dt><dd>{formatDate(transaction.date)}</dd></div>
              <div><dt className="text-muted-foreground">Accounts</dt><dd>{transaction.type === "transfer" ? `${accountName(transaction.fromAccountId)} → ${accountName(transaction.toAccountId)}` : accountName(transaction.accountId)}</dd></div>
              {category && <div><dt className="text-muted-foreground">Category</dt><dd>{category.name}</dd></div>}
              {transaction.notes && <div><dt className="text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap">{transaction.notes}</dd></div>}
              {transaction.tags?.length ? <div><dt className="text-muted-foreground">Tags</dt><dd>{transaction.tags.join(", ")}</dd></div> : null}
              {transaction.notificationSource && <div><dt className="text-muted-foreground">Capture</dt><dd>{transaction.notificationSource.provider} · {1 + (transaction.linkedNotifications?.length ?? 0)} linked notification(s)</dd></div>}
            </dl>
            <div className="grid grid-cols-2 gap-2"><Button onClick={() => { setDetailOpen(false); onEditRequest(transaction) }} aria-label={`Edit ${transaction.description}`}>Edit</Button><Button variant="destructive" onClick={() => { setDetailOpen(false); onDeleteRequest(transaction) }} aria-label={`Delete ${transaction.description}`}>Delete</Button></div>
          </DialogContent>
        </Dialog>
      </td>
    </tr>
  )
}

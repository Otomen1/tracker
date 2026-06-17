"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Transaction, Category, TransactionFormData } from "@/types"
import { TransactionRow } from "./TransactionRow"
import { TransactionDialog } from "./TransactionDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { ArrowLeftRight, ChevronLeft, ChevronRight, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PAGE_SIZE, UNDO_TIMEOUT_MS } from "@/lib/constants"

interface Props {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: (id: string, data: TransactionFormData) => void
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, categories, onUpdate, onDelete }: Props) {
  const [page, setPage] = useState(0)
  const [editTarget, setEditTarget] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)
  const [undoItem, setUndoItem] = useState<Transaction | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setPage(0) }, [transactions])
  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return
    const deleted = deleteTarget
    onDelete(deleted.id)
    setDeleteTarget(null)
    setUndoItem(deleted)
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = setTimeout(() => setUndoItem(null), UNDO_TIMEOUT_MS)
  }, [deleteTarget, onDelete])

  const handleUndo = useCallback(() => {
    if (!undoItem) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    // Re-add as a new transaction with same data
    onUpdate(undoItem.id, {
      type: undoItem.type,
      amount: String(undoItem.amount),
      categoryId: undoItem.categoryId,
      description: undoItem.description,
      date: undoItem.date,
      notes: undoItem.notes,
      tags: undoItem.tags,
      isRecurring: undoItem.isRecurring,
      recurringDay: undoItem.recurringDay,
    })
    setUndoItem(null)
  }, [undoItem, onUpdate])

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No transactions found</p>
        <p className="text-xs mt-1">Add one above or adjust your filters</p>
      </div>
    )
  }

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)
  const pageItems = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const start = page * PAGE_SIZE + 1
  const end = Math.min((page + 1) * PAGE_SIZE, transactions.length)

  return (
    <div className="space-y-3">
      {undoItem && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg text-sm">
          <span>Transaction deleted</span>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1.5 text-zinc-100 dark:text-zinc-900 hover:bg-white/10 dark:hover:bg-black/10"
            onClick={handleUndo}
          >
            <Undo2 className="w-3.5 h-3.5" />
            Undo
          </Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-700">
              <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left">Date</th>
              <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left">Description</th>
              <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left">Category</th>
              <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left hidden sm:table-cell">Type</th>
              <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-right">Amount</th>
              <th scope="col" className="py-3 px-4 w-20" />
            </tr>
          </thead>
          <tbody>
            {pageItems.map((t) => (
              <TransactionRow
                key={t.id}
                transaction={t}
                categories={categories}
                onEditRequest={setEditTarget}
                onDeleteRequest={setDeleteTarget}
              />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-zinc-400">
            {start}–{end} of {transactions.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="text-xs text-zinc-500 px-1.5">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      <TransactionDialog
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        transaction={editTarget ?? undefined}
        categories={categories}
        onSubmit={(data) => { if (editTarget) { onUpdate(editTarget.id, data); setEditTarget(null) } }}
      />
      <DeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        description="Are you sure you want to delete this transaction? This cannot be undone."
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

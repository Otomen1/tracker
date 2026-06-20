"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Transaction, Category, TransactionFormData } from "@/types"
import { TransactionRow } from "./TransactionRow"
import { TransactionDialog } from "./TransactionDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { ArrowLeftRight, ChevronLeft, ChevronRight, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PAGE_SIZE, UNDO_TIMEOUT_MS } from "@/lib/constants"
import { useSettingsContext } from "@/context/SettingsContext"

interface Props {
  transactions: Transaction[]
  categories: Category[]
  filterKey?: string
  onRestore: (transaction: Transaction) => void
  onUpdate: (id: string, data: TransactionFormData) => void
  onDelete: (id: string, cascade: boolean) => void
}

export function TransactionList({ transactions, categories, filterKey, onRestore, onUpdate, onDelete }: Props) {
  const { fmt } = useSettingsContext()
  const [page, setPage] = useState(0)
  const [editTarget, setEditTarget] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  // Undo queue: each entry has a transaction and its own expiry timer
  const [undoQueue, setUndoQueue] = useState<Transaction[]>([])
  const undoTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Reset page when filter identity changes (not on individual transaction edits)
  useEffect(() => { setPage(0) }, [filterKey])

  // Cleanup all timers on unmount
  useEffect(() => () => {
    undoTimersRef.current.forEach((t) => clearTimeout(t))
  }, [])

  const handleDeleteConfirm = useCallback((cascade: boolean) => {
    if (!deleteTarget) return
    const deleted = deleteTarget
    onDelete(deleted.id, cascade)
    setDeleteTarget(null)

    const timer = setTimeout(() => {
      setUndoQueue((q) => q.filter((item) => item.id !== deleted.id))
      undoTimersRef.current.delete(deleted.id)
    }, UNDO_TIMEOUT_MS)

    undoTimersRef.current.set(deleted.id, timer)
    setUndoQueue((prev) => [deleted, ...prev])
  }, [deleteTarget, onDelete])

  const handleUndo = useCallback(() => {
    if (undoQueue.length === 0) return
    const item = undoQueue[0]
    const timer = undoTimersRef.current.get(item.id)
    if (timer) clearTimeout(timer)
    undoTimersRef.current.delete(item.id)
    setUndoQueue((q) => q.slice(1))
    onRestore(item)
  }, [undoQueue, onRestore])

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No transactions found</p>
        <p className="text-xs mt-1">Add one above or adjust your filters</p>
      </div>
    )
  }

  // Build recurring instance count map for cascade delete UI
  const instanceCountMap = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach((t) => {
      if (t.recurringId) {
        map.set(t.recurringId, (map.get(t.recurringId) ?? 0) + 1)
      }
    })
    return map
  }, [transactions])

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)
  const pageItems = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const start = page * PAGE_SIZE + 1
  const end = Math.min((page + 1) * PAGE_SIZE, transactions.length)

  const pendingUndo = undoQueue[0] ?? null

  return (
    <div className="space-y-3">
      {pendingUndo && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg text-sm"
        >
          <span>
            Deleted{" "}
            <span className="font-medium">{pendingUndo.description}</span>
            {" · "}{fmt(pendingUndo.amount)}
            {undoQueue.length > 1 && (
              <span className="opacity-60"> (+{undoQueue.length - 1} more)</span>
            )}
          </span>
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
                recurringInstanceCount={instanceCountMap.get(t.id) ?? 0}
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
        description="Delete this transaction? You can undo within a few seconds."
        cascadeCount={deleteTarget?.isRecurring ? (instanceCountMap.get(deleteTarget.id) ?? 0) : undefined}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}

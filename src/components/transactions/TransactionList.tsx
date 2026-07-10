"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { Transaction, Category, TransactionFormData } from "@/types"
import { TransactionRow } from "./TransactionRow"
import { TransactionDialog } from "./TransactionDialog"
import { DeleteConfirmDialog } from "./DeleteConfirmDialog"
import { BulkActionBar } from "./BulkActionBar"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ArrowLeftRight, ChevronLeft, ChevronRight, ListChecks, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PAGE_SIZE, UNDO_TIMEOUT_MS } from "@/lib/constants"
import { useSettingsContext } from "@/context/SettingsContext"
import { reconcileSelection, getSelectionTypeState } from "@/lib/transactionBatch"

interface UndoEntry {
  id: string
  transactions: Transaction[]
}

interface Props {
  transactions: Transaction[]
  categories: Category[]
  filterKey?: string
  onRestore: (transaction: Transaction) => void
  onUpdate: (id: string, data: TransactionFormData) => void
  onDelete: (id: string, cascade: boolean) => void
  onBulkDelete: (ids: string[], cascade: boolean) => void
  onBulkRestore: (transactions: Transaction[]) => void
  onBulkRecategorize: (ids: string[], categoryId: string) => void
}

export function TransactionList({
  transactions,
  categories,
  filterKey,
  onRestore,
  onUpdate,
  onDelete,
  onBulkDelete,
  onBulkRestore,
  onBulkRecategorize,
}: Props) {
  const { fmt } = useSettingsContext()
  const [page, setPage] = useState(0)
  const [editTarget, setEditTarget] = useState<Transaction | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  // Undo queue: each entry is one undo-able operation (a single delete is
  // just a batch of one) with its own expiry timer, so bulk delete gets the
  // exact same undo window and mechanism as single-row delete.
  const [undoQueue, setUndoQueue] = useState<UndoEntry[]>([])
  const undoTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Bulk-selection UI state - temporary, never persisted, cleared on exit.
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [recategorizeOpen, setRecategorizeOpen] = useState(false)
  const [recategorizeCategoryId, setRecategorizeCategoryId] = useState("")
  const selectToggleRef = useRef<HTMLButtonElement>(null)

  // Reset page when filter identity changes (not on individual transaction edits)
  useEffect(() => { setPage(0) }, [filterKey])

  // Cleanup all timers on unmount
  useEffect(() => () => {
    undoTimersRef.current.forEach((t) => clearTimeout(t))
  }, [])

  // Reconcile selection whenever the filtered result set changes (a filter
  // changed, or a mutation removed/recategorized rows out of view) so a
  // bulk action can never reach a transaction the user can no longer see.
  useEffect(() => {
    setSelectedIds((prev) => reconcileSelection(prev, transactions.map((t) => t.id)))
  }, [transactions])

  // Keep focus predictable across the select-mode transition: the "Select"
  // toggle button unmounts the instant select mode turns on (replaced by the
  // BulkActionBar), and the bar unmounts the instant it turns off - either
  // way the previously-focused element disappears from the DOM and focus
  // would otherwise silently fall back to <body>. Only acts on an actual
  // true<->false transition (guarded by the ref), not on initial mount.
  const prevSelectModeRef = useRef(selectMode)
  useEffect(() => {
    if (prevSelectModeRef.current !== selectMode) {
      if (selectMode) {
        document.getElementById("bulk-action-cancel")?.focus()
      } else {
        selectToggleRef.current?.focus()
      }
    }
    prevSelectModeRef.current = selectMode
  }, [selectMode])

  const handleDeleteConfirm = useCallback((cascade: boolean) => {
    if (!deleteTarget) return
    const deleted = deleteTarget
    onDelete(deleted.id, cascade)
    setDeleteTarget(null)

    const entryId = crypto.randomUUID()
    const timer = setTimeout(() => {
      setUndoQueue((q) => q.filter((e) => e.id !== entryId))
      undoTimersRef.current.delete(entryId)
    }, UNDO_TIMEOUT_MS)

    undoTimersRef.current.set(entryId, timer)
    setUndoQueue((prev) => [{ id: entryId, transactions: [deleted] }, ...prev])
  }, [deleteTarget, onDelete])

  const handleUndo = useCallback(() => {
    if (undoQueue.length === 0) return
    const entry = undoQueue[0]
    const timer = undoTimersRef.current.get(entry.id)
    if (timer) clearTimeout(timer)
    undoTimersRef.current.delete(entry.id)
    setUndoQueue((q) => q.slice(1))
    onBulkRestore(entry.transactions)
  }, [undoQueue, onBulkRestore])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Build recurring instance count map for cascade delete UI. Computed before
  // the empty-state early return below - hooks must run unconditionally on
  // every render, or the transactions list flipping from empty to non-empty
  // (adding the very first transaction) changes the hook count mid-lifetime
  // and crashes with "Rendered fewer hooks than expected".
  const instanceCountMap = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach((t) => {
      if (t.recurringId) {
        map.set(t.recurringId, (map.get(t.recurringId) ?? 0) + 1)
      }
    })
    return map
  }, [transactions])

  const selectionTypeState = useMemo(
    () => getSelectionTypeState(transactions, selectedIds),
    [transactions, selectedIds]
  )

  const bulkCascadeCount = useMemo(() => {
    let count = 0
    selectedIds.forEach((id) => {
      const t = transactions.find((tx) => tx.id === id)
      if (t?.isRecurring) count += instanceCountMap.get(id) ?? 0
    })
    return count
  }, [selectedIds, transactions, instanceCountMap])

  const categoryOptionsForRecategorize = useMemo(
    () => (selectionTypeState.commonType ? categories.filter((c) => c.type === selectionTypeState.commonType) : []),
    [categories, selectionTypeState.commonType]
  )

  const handleBulkDeleteConfirm = useCallback((cascade: boolean) => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    // Capture everything this action will actually remove, including any
    // cascade-swept instances of a selected recurring template - not just
    // the explicitly checked rows - so undo can restore the complete batch
    // and never orphan a recurring relationship.
    const captured = transactions.filter(
      (t) => selectedIds.has(t.id) || (cascade && !!t.recurringId && selectedIds.has(t.recurringId))
    )

    onBulkDelete(ids, cascade)
    setBulkDeleteOpen(false)
    exitSelectMode()

    const entryId = crypto.randomUUID()
    const timer = setTimeout(() => {
      setUndoQueue((q) => q.filter((e) => e.id !== entryId))
      undoTimersRef.current.delete(entryId)
    }, UNDO_TIMEOUT_MS)

    undoTimersRef.current.set(entryId, timer)
    setUndoQueue((prev) => [{ id: entryId, transactions: captured }, ...prev])
  }, [selectedIds, transactions, onBulkDelete, exitSelectMode])

  const handleRecategorizeConfirm = useCallback(() => {
    if (!recategorizeCategoryId || selectedIds.size === 0) return
    onBulkRecategorize(Array.from(selectedIds), recategorizeCategoryId)
    setRecategorizeOpen(false)
    setRecategorizeCategoryId("")
    exitSelectMode()
  }, [recategorizeCategoryId, selectedIds, onBulkRecategorize, exitSelectMode])

  const isEmpty = transactions.length === 0
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE)
  const pageItems = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const start = page * PAGE_SIZE + 1
  const end = Math.min((page + 1) * PAGE_SIZE, transactions.length)

  const pendingUndo = undoQueue[0] ?? null
  const allSelected = selectedIds.size > 0 && selectedIds.size === transactions.length

  return (
    <div className="space-y-3">
      {pendingUndo && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-center justify-between gap-2 px-3 py-2 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-lg text-sm"
        >
          <span>
            {pendingUndo.transactions.length === 1 ? (
              <>
                Deleted{" "}
                <span className="font-medium">{pendingUndo.transactions[0].description}</span>
                {" · "}{fmt(pendingUndo.transactions[0].amount)}
              </>
            ) : (
              <>
                Deleted <span className="font-medium">{pendingUndo.transactions.length} transactions</span>
              </>
            )}
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

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
          <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm font-medium">No transactions found</p>
          <p className="text-xs mt-1">Add one above or adjust your filters</p>
        </div>
      ) : selectMode ? (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalFilteredCount={transactions.length}
          allSelected={allSelected}
          isMixedType={selectionTypeState.isMixed}
          onSelectAll={() => setSelectedIds(new Set(transactions.map((t) => t.id)))}
          onClear={() => setSelectedIds(new Set())}
          onRecategorize={() => setRecategorizeOpen(true)}
          onDelete={() => setBulkDeleteOpen(true)}
          onExit={exitSelectMode}
        />
      ) : (
        <div className="flex justify-end">
          <Button
            ref={selectToggleRef}
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setSelectMode(true)}
          >
            <ListChecks className="w-3.5 h-3.5" />
            Select
          </Button>
        </div>
      )}

      {!isEmpty && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  {selectMode && (
                    <th scope="col" className="py-3 pl-4 pr-1 w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && !allSelected }}
                        onChange={() => {
                          if (allSelected) setSelectedIds(new Set())
                          else setSelectedIds(new Set(transactions.map((t) => t.id)))
                        }}
                        aria-label={allSelected ? "Clear all selected transactions" : "Select all filtered transactions"}
                        className="rounded border-zinc-300 dark:border-zinc-600 accent-zinc-900 dark:accent-zinc-100"
                      />
                    </th>
                  )}
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
                    selectMode={selectMode}
                    selected={selectedIds.has(t.id)}
                    onToggleSelect={toggleSelect}
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
        </>
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

      <DeleteConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selectedIds.size} transaction${selectedIds.size !== 1 ? "s" : ""}`}
        description="This action cannot be undone. You can undo within a few seconds."
        cascadeCount={bulkCascadeCount}
        onConfirm={handleBulkDeleteConfirm}
      />

      <Dialog open={recategorizeOpen} onOpenChange={setRecategorizeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Recategorize {selectedIds.size} transaction{selectedIds.size !== 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="bulk-recategorize-select">New category</Label>
            <Select value={recategorizeCategoryId} onValueChange={setRecategorizeCategoryId}>
              <SelectTrigger id="bulk-recategorize-select">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptionsForRecategorize.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setRecategorizeOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!recategorizeCategoryId} onClick={handleRecategorizeConfirm}>
              Recategorize
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

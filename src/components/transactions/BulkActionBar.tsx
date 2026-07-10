"use client"

import { Button } from "@/components/ui/button"
import { Tags, Trash2, X } from "lucide-react"

interface Props {
  selectedCount: number
  totalFilteredCount: number
  allSelected: boolean
  isMixedType: boolean
  onSelectAll: () => void
  onClear: () => void
  onRecategorize: () => void
  onDelete: () => void
  onExit: () => void
}

export function BulkActionBar({
  selectedCount,
  totalFilteredCount,
  allSelected,
  isMixedType,
  onSelectAll,
  onClear,
  onRecategorize,
  onDelete,
  onExit,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70">
      <div className="flex flex-wrap items-center gap-2">
        <span role="status" aria-live="polite" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {selectedCount} selected
        </span>
        {allSelected ? (
          <Button variant="ghost" size="sm" className="h-8" onClick={onClear}>
            Clear selection
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-8" onClick={onSelectAll}>
            Select all {totalFilteredCount}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isMixedType ? (
          <span className="text-xs text-zinc-400">Select one type to recategorize</span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            disabled={selectedCount === 0}
            onClick={onRecategorize}
          >
            <Tags className="w-3.5 h-3.5" />
            Recategorize
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
          disabled={selectedCount === 0}
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
        <Button id="bulk-action-cancel" variant="ghost" size="sm" className="h-8 gap-1.5" onClick={onExit}>
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

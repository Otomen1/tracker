"use client"

import { useState } from "react"
import { Category, CategoryFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Lock } from "lucide-react"
import { useSettingsContext } from "@/context/SettingsContext"
import { CategoryDialog } from "./CategoryDialog"
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog"

interface Props {
  category: Category
  existingNames: string[]
  hasTransactions: boolean
  onUpdate: (id: string, data: Partial<CategoryFormData>) => void
  onDelete: (id: string) => { success: boolean; error?: string }
}

export function CategoryCard({ category, existingNames, hasTransactions, onUpdate, onDelete }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const { fmt } = useSettingsContext()

  const handleDelete = () => {
    const result = onDelete(category.id)
    if (!result.success) {
      setDeleteError(result.error ?? "Cannot delete")
      setDeleteOpen(false)
    }
  }

  return (
    <>
      <div className="group flex items-center justify-between px-4 py-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 bg-white/60 dark:bg-zinc-800/30 backdrop-blur-sm hover:border-zinc-300/80 dark:hover:border-zinc-700/60 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{category.name}</p>
              {category.budget && category.budget > 0 && (
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  Budget: {fmt(category.budget)}/mo
                </span>
              )}
            </div>
            {category.isDefault && <p className="text-xs text-zinc-400">Default</p>}
            {deleteError && <p className="text-xs text-rose-500">{deleteError}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {category.isDefault ? (
            <div className="w-7 h-7 flex items-center justify-center">
              <Lock className="w-3.5 h-3.5 text-zinc-300" />
            </div>
          ) : (
            <>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setDeleteError(""); setEditOpen(true) }}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                onClick={() => { setDeleteError(""); setDeleteOpen(true) }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      <CategoryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
        existingNames={existingNames}
        onSubmit={(data) => onUpdate(category.id, data)}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${category.name}"`}
        description={hasTransactions ? "This category has transactions. Delete them first before removing this category." : "This will permanently delete this category."}
        onConfirm={handleDelete}
      />
    </>
  )
}

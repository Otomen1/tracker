"use client"

import { useState } from "react"
import { Category, Transaction, CategoryFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CategoryCard } from "./CategoryCard"
import { CategoryDialog } from "./CategoryDialog"

interface Props {
  title: string
  type: "income" | "expense"
  categories: Category[]
  transactions: Transaction[]
  onAdd: (data: CategoryFormData) => void
  onUpdate: (id: string, data: Partial<CategoryFormData>) => void
  onDelete: (id: string) => { success: boolean; error?: string }
}

export function CategoryList({
  title,
  type,
  categories,
  transactions,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [addOpen, setAddOpen] = useState(false)

  const existingNames = categories.map((c) => c.name)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-zinc-700 uppercase tracking-wide">
          {title}
        </h2>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      <div className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No categories yet</p>
        ) : (
          categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              existingNames={existingNames}
              hasTransactions={transactions.some((t) => t.categoryId === cat.id)}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))
        )}
      </div>

      <CategoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultType={type}
        existingNames={existingNames}
        onSubmit={onAdd}
      />
    </div>
  )
}

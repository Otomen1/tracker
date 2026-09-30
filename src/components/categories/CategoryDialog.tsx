"use client"

import { Category, CategoryFormData } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CategoryForm } from "./CategoryForm"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: Category
  defaultType?: "income" | "expense"
  existingNames?: string[]
  onSubmit: (data: CategoryFormData) => Promise<unknown> | unknown
}

export function CategoryDialog({
  open,
  onOpenChange,
  category,
  defaultType,
  existingNames,
  onSubmit,
}: Props) {
  const handleSubmit = async (data: CategoryFormData) => {
    const result = await onSubmit(data)
    if (result !== false && result !== null) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {category ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        <CategoryForm
          category={category}
          defaultType={defaultType}
          existingNames={existingNames}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

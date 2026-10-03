"use client"

import { useRef } from "react"
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
  const saving = useRef(false)
  const dismiss = (value: boolean) => { if (!saving.current) onOpenChange(value) }
  const handleSubmit = async (data: CategoryFormData) => {
    if (saving.current) return
    saving.current = true
    try {
      const result = await onSubmit(data)
      if (result !== false && result !== null) onOpenChange(false)
    } finally { saving.current = false }
  }

  return (
    <Dialog open={open} onOpenChange={dismiss}>
      <DialogContent onEscapeKeyDown={(event) => { if (saving.current) event.preventDefault() }} onInteractOutside={(event) => { if (saving.current) event.preventDefault() }} className="sm:max-w-sm">
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
          onCancel={() => dismiss(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

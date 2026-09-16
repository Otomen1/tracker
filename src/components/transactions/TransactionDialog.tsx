"use client"

import { Transaction, Category, TransactionFormData } from "@/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { TransactionForm } from "./TransactionForm"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction
  categories: Category[]
  onSubmit: (data: TransactionFormData) => boolean | void
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  onSubmit,
}: Props) {
  const handleSubmit = (data: TransactionFormData) => {
    if (onSubmit(data) !== false) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto max-h-[calc(100dvh-env(safe-area-inset-top)-0.75rem)] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-h-[90vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:p-6 sm:data-[state=closed]:slide-out-to-left-1/2 sm:data-[state=closed]:slide-out-to-top-[48%] sm:data-[state=open]:slide-in-from-left-1/2 sm:data-[state=open]:slide-in-from-top-[48%]">
        <DialogHeader>
          <DialogTitle>
            {transaction ? "Edit Transaction" : "Add Transaction"}
          </DialogTitle>
        </DialogHeader>
        <TransactionForm
          transaction={transaction}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

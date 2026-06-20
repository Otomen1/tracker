"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { TransactionFormData } from "@/types"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"

export function QuickAddFAB() {
  const [open, setOpen] = useState(false)
  const { addTransaction } = useTransactions()
  const { categories } = useCategories()

  const handleAdd = (data: TransactionFormData) => {
    addTransaction(data)
    setOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30 w-14 h-14 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6" />
      </button>
      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        categories={categories}
        onSubmit={handleAdd}
      />
    </>
  )
}

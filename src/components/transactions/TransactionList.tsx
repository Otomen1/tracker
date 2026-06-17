"use client"

import { useEffect, useState } from "react"
import { Transaction, Category, TransactionFormData } from "@/types"
import { TransactionRow } from "./TransactionRow"
import { ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 25

interface Props {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: (id: string, data: TransactionFormData) => void
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, categories, onUpdate, onDelete }: Props) {
  const [page, setPage] = useState(0)

  useEffect(() => { setPage(0) }, [transactions])

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
                onUpdate={onUpdate}
                onDelete={onDelete}
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
    </div>
  )
}

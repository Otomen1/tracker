"use client"

import { Transaction, Category, TransactionFormData } from "@/types"
import { TransactionRow } from "./TransactionRow"
import { ArrowLeftRight } from "lucide-react"

interface Props {
  transactions: Transaction[]
  categories: Category[]
  onUpdate: (id: string, data: TransactionFormData) => void
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, categories, onUpdate, onDelete }: Props) {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
        <ArrowLeftRight className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm font-medium">No transactions found</p>
        <p className="text-xs mt-1">Add one above or adjust your filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200">
            <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left">Date</th>
            <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left">Description</th>
            <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left">Category</th>
            <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left hidden sm:table-cell">Type</th>
            <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-right">Amount</th>
            <th scope="col" className="py-3 px-4 w-20" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
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
  )
}

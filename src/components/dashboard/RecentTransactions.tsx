"use client"
import { useState } from "react"
import Link from "next/link"
import { Transaction, Category } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight } from "lucide-react"
import { TransactionRow } from "@/components/transactions/TransactionRow"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog"
import { useTransactions } from "@/hooks/useTransactions"
import { useToast } from "@/context/ToastContext"
interface Props { transactions: Transaction[]; categories: Category[] }
export function RecentTransactions({ transactions, categories }: Props) {
  const [edit, setEdit] = useState<Transaction | null>(null)
  const [remove, setRemove] = useState<Transaction | null>(null)
  const { transactions: all, updateTransaction, deleteTransaction, deleteWithCascade } = useTransactions()
  const { showToast } = useToast()
  return <Card className="border-zinc-200 dark:border-zinc-800">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
      <Link href="/transactions" className="inline-flex min-h-12 items-center gap-1 text-sm">View all <ArrowRight className="h-4 w-4" /></Link>
    </CardHeader>
    <CardContent className="px-2 sm:px-4">
      {transactions.length ? <div className="overflow-x-auto"><table className="w-full"><caption className="sr-only">Recent recorded transactions. Tap a row for details.</caption><tbody>{transactions.map(transaction => <TransactionRow key={transaction.id} transaction={transaction} categories={categories} onEditRequest={setEdit} onDeleteRequest={setRemove} />)}</tbody></table></div> : <p className="p-4 text-sm text-muted-foreground">Your latest transactions will appear here.</p>}
      <TransactionDialog open={!!edit} onOpenChange={open => { if (!open) setEdit(null) }} transaction={edit ?? undefined} categories={categories} onSubmit={async data => {
        if (!edit) return false
        const saved = await updateTransaction(edit.id, data)
        showToast(saved ? "Transaction updated" : "Could not save. Your input is kept.", saved ? "success" : "error")
        return saved
      }} />
      <DeleteConfirmDialog open={!!remove} onOpenChange={open => { if (!open) setRemove(null) }} cascadeCount={remove?.isRecurring ? all.filter(t => t.recurringId === remove.id).length : 0} onConfirm={async cascade => {
        if (!remove) return false
        const saved = cascade ? await deleteWithCascade(remove.id) : await deleteTransaction(remove.id)
        showToast(saved ? "Transaction deleted" : "Could not delete. Your record is kept.", saved ? "success" : "error")
        return saved
      }} />
    </CardContent>
  </Card>
}

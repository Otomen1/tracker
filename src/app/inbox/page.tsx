"use client"

import { FormEvent, useMemo, useState } from "react"
import { BellRing, RefreshCw, Trash2 } from "lucide-react"
import { useReviewInbox } from "@/context/ReviewInboxContext"
import { useAccounts } from "@/context/AccountsContext"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useToast } from "@/context/ToastContext"
import { useSettingsContext } from "@/context/SettingsContext"
import { EntryType, PendingTransaction } from "@/types"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function localDate(iso: string) { const date = new Date(iso); return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` }

function ReviewItem({ item }: { item: PendingTransaction }) {
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { confirmCaptured, confirmTransfer } = useTransactions()
  const { resolve, discard } = useReviewInbox()
  const { showToast } = useToast()
  const { fmt } = useSettingsContext()
  const [type, setType] = useState<EntryType>(item.direction)
  const [amount, setAmount] = useState(String(item.amount))
  const [description, setDescription] = useState(item.description)
  const [date, setDate] = useState(localDate(item.occurredAt))
  const [accountId, setAccountId] = useState(item.accountId)
  const [categoryId, setCategoryId] = useState("")
  const [transfer, setTransfer] = useState(false)
  const [toAccountId, setToAccountId] = useState(accounts.find((account) => account.id !== item.accountId)?.id ?? "")
  const matchingCategories = useMemo(() => categories.filter((category) => category.type === type), [categories, type])

  const save = async (event: FormEvent) => {
    event.preventDefault()
    const parsedAmount = Number(amount)
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return showToast("Enter a valid amount.", "error")
    if (!transfer && !categoryId) return showToast("Choose a category before confirming.", "error")
    const result = transfer
      ? confirmTransfer(item, accountId, toAccountId, description, date)
      : confirmCaptured(item, { type, amount: parsedAmount, categoryId, description, date, accountId })
    if (result === "failed") return showToast("Transaction could not be saved.", "error")
    await resolve(item.id)
    showToast(result === "duplicate" ? "Already saved; duplicate removed from review." : transfer ? "Transfer confirmed" : "Transaction confirmed", result === "duplicate" ? "warning" : "success")
  }

  return <form onSubmit={save} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold uppercase dark:bg-zinc-800">{item.provider}</span><p className="mt-2 text-2xl font-bold">{fmt(item.amount)}</p><p className="mt-1 text-sm text-zinc-500">{item.description}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Discard detected transaction" onClick={() => void discard(item.id)}><Trash2 /></Button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor={`amount-${item.id}`}>Amount</Label><Input id={`amount-${item.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor={`date-${item.id}`}>Date</Label><Input id={`date-${item.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`description-${item.id}`}>Description</Label><Input id={`description-${item.id}`} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor={`account-${item.id}`}>{transfer ? "From account" : "Account"}</Label><select id={`account-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={accountId} onChange={(e) => setAccountId(e.target.value)}>{accounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      {!transfer && <><div className="space-y-1.5"><Label htmlFor={`type-${item.id}`}>Type</Label><select id={`type-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={type} onChange={(e) => { setType(e.target.value as EntryType); setCategoryId("") }}><option value="expense">Expense</option><option value="income">Income</option></select></div><div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`category-${item.id}`}>Category</Label><select id={`category-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Choose a category</option>{matchingCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></>}
      {transfer && <div className="space-y-1.5"><Label htmlFor={`to-${item.id}`}>To account</Label><select id={`to-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>{accounts.filter((a) => a.isActive && a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
    </div>
    <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button type="submit" className="sm:flex-1">{transfer ? "Confirm transfer" : "Confirm transaction"}</Button><Button type="button" variant="outline" onClick={() => setTransfer((value) => !value)}>{transfer ? "Treat as normal payment" : "Mark as internal transfer"}</Button></div>
  </form>
}

export default function InboxPage() {
  const { items, loading, refresh } = useReviewInbox()
  return <div className="space-y-5"><PageHeader title="Review inbox" description="Confirm transactions detected from Ryt Bank and MAE" action={<Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw />Refresh</Button>} />{loading ? <p className="text-sm text-zinc-500">Checking secure inbox…</p> : items.length ? <div className="space-y-4">{items.map((item) => <ReviewItem key={item.id} item={item} />)}</div> : <div className="rounded-xl border border-dashed border-zinc-300 px-5 py-12 text-center dark:border-zinc-700"><BellRing className="mx-auto h-9 w-9 text-zinc-400" /><h2 className="mt-3 font-semibold">Nothing waiting for review</h2><p className="mt-1 text-sm text-zinc-500">New supported bank notifications will appear here.</p></div>}</div>
}

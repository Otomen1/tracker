"use client"

import { FormEvent, useMemo, useState, useRef } from "react"
import { BellRing, RefreshCw, Trash2 } from "lucide-react"
import { useReviewInbox } from "@/context/ReviewInboxContext"
import { useAccounts } from "@/context/AccountsContext"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useToast } from "@/context/ToastContext"
import { useVault } from "@/context/VaultContext"
import { useSettingsContext } from "@/context/SettingsContext"
import { EntryType, PendingTransaction } from "@/types"
import { parseMoney, transferEndpoints } from "@/domain/finance"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function localDate(iso: string) { const date = new Date(iso); return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` }

function ReviewItem({ item }: { item: PendingTransaction }) {
  const { accounts } = useAccounts()
  const { categories } = useCategories()
  const { transactions, confirmCaptured, confirmTransfer, linkCaptured } = useTransactions()
  const { resolve, discard } = useReviewInbox()
  const { showToast } = useToast()
  const { error: vaultError } = useVault()
  const { fmt } = useSettingsContext()
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingId, setExistingId] = useState("")
  const [type, setType] = useState<EntryType>(item.direction)
  const [amount, setAmount] = useState(String(item.amount))
  const [description, setDescription] = useState(item.description)
  const [date, setDate] = useState(localDate(item.occurredAt))
  const [accountId, setAccountId] = useState(item.accountId)
  const [categoryId, setCategoryId] = useState("")
  const [transfer, setTransfer] = useState(false)
  const [toAccountId, setToAccountId] = useState(accounts.find((account) => account.id !== item.accountId)?.id ?? "")
  const matchingCategories = useMemo(() => categories.filter((category) => category.type === type), [categories, type])

  const cleanup = async () => {
    try { await resolve(item.id) }
    catch { setError("Saved successfully. Review cleanup failed; confirm again to retry cleanup without saving a duplicate."); return false }
    return true
  }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (saving.current) return
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      const parsedAmount = parseMoney(amount)
      if (parsedAmount <= 0) throw new Error("Enter a positive amount.")
      if (existingId) {
        if (!await linkCaptured(item, existingId)) throw new Error("Could not link this notification. Check storage and retry.")
        if (await cleanup()) showToast("Linked to the existing transfer", "success")
        return
      }
      if (!transfer && !categoryId) throw new Error("Choose a category before confirming.")
      const endpoints = transferEndpoints({ ...item, accountId }, toAccountId)
      const result = transfer
        ? await confirmTransfer(item, endpoints.fromAccountId, endpoints.toAccountId, description, date, parsedAmount)
        : await confirmCaptured(item, { type, amount: parsedAmount, categoryId, description, date, accountId })
      if (result === "failed") throw new Error(vaultError ?? "Could not save. Check active accounts, matching category, date and storage, then retry.")
      if (await cleanup()) showToast(result === "duplicate" ? "Already saved; review item removed." : "Transaction confirmed", "success")
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save; your review item is kept.") }
    finally { saving.current = false; setBusy(false) }
  }

  return <form onSubmit={save} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
    <div className="flex items-start justify-between gap-3"><div><span className="rounded-full bg-zinc-100 px-2 py-1 text-[11px] font-semibold uppercase dark:bg-zinc-800">{item.provider}</span><p className="mt-2 text-2xl font-bold">{fmt(item.amount)}</p><p className="mt-1 text-sm text-zinc-500">{item.description}</p></div><Button type="button" variant="ghost" size="icon" aria-label="Discard detected transaction" disabled={busy} onClick={async () => { if (saving.current) return; if (!window.confirm("Discard this detected notification? Confirmed transactions are kept.")) return; try { await discard(item.id) } catch { setError("Could not discard. Retry.") } }}><Trash2 /></Button></div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor={`amount-${item.id}`}>Amount</Label><Input id={`amount-${item.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor={`date-${item.id}`}>Date</Label><Input id={`date-${item.id}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`description-${item.id}`}>Description</Label><Input id={`description-${item.id}`} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
      <div className="space-y-1.5"><Label htmlFor={`account-${item.id}`}>{transfer ? item.direction === "income" ? "To account (detected)" : "From account (detected)" : "Account"}</Label><select id={`account-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={accountId} onChange={(e) => { setAccountId(e.target.value); if (e.target.value === toAccountId) setToAccountId("") }}>{accounts.filter((a) => a.isActive).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      {!transfer && <><div className="space-y-1.5"><Label htmlFor={`type-${item.id}`}>Type</Label><select id={`type-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={type} onChange={(e) => { setType(e.target.value as EntryType); setCategoryId("") }}><option value="expense">Expense</option><option value="income">Income</option></select></div><div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`category-${item.id}`}>Category</Label><select id={`category-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}><option value="">Choose a category</option>{matchingCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></>}
      {transfer && <div className="space-y-1.5"><Label htmlFor={`to-${item.id}`}>{item.direction === "income" ? "From account" : "To account"}</Label><select id={`to-${item.id}`} className="h-10 w-full rounded-md border bg-transparent px-3 text-sm" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}><option value="">Choose an account</option>{accounts.filter((a) => a.isActive && a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>}
    </div>
    <p className="mt-3 text-xs text-muted-foreground">Detected in: {accounts.find(a => a.id === item.accountId)?.name ?? item.provider}. Incoming detections are recorded against this source.</p>
    <label className="mt-3 block text-sm">Already recorded as a transfer? Link it explicitly
      <select className="mt-1 min-h-11 w-full rounded-md border bg-transparent px-3" value={existingId} onChange={e => setExistingId(e.target.value)} disabled={busy}>
        <option value="">Create a new record</option>{transactions.filter(t => t.type === "transfer" && [t.fromAccountId, t.toAccountId].includes(item.accountId)).slice(0, 100).map(t => <option key={t.id} value={t.id}>{t.date} · {t.description} · {t.amount}</option>)}
      </select>
    </label>
    {existingId && <p className="mt-2 text-xs text-amber-700">Link only when this is the same transfer. No extra transaction will be created; edited fields above are not applied.</p>}
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error} {vaultError}</p>}
    <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button type="submit" disabled={busy} className="sm:flex-1">{busy ? "Saving…" : existingId ? "Link and remove review item" : transfer ? "Confirm transfer" : "Confirm transaction"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setTransfer((value) => !value)}>{transfer ? "Treat as normal payment" : "Mark as internal transfer"}</Button></div>
  </form>
}

export default function InboxPage() {
  const { error: vaultError } = useVault()
  const { items, loading, error, refresh } = useReviewInbox()
  return <div className="space-y-5"><PageHeader title="Review inbox" description="Confirm transactions detected from Ryt Bank and MAE" action={<Button variant="outline" size="sm" onClick={() => void refresh()}><RefreshCw />Refresh</Button>} />{error && <p role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">{error} {vaultError}</p>}{loading ? <p className="text-sm text-zinc-500">Checking secure inbox…</p> : items.length ? <div className="space-y-4">{items.map((item) => <ReviewItem key={item.id} item={item} />)}</div> : <div className="rounded-xl border border-dashed border-zinc-300 px-5 py-12 text-center dark:border-zinc-700"><BellRing className="mx-auto h-9 w-9 text-zinc-400" /><h2 className="mt-3 font-semibold">Nothing waiting for review</h2><p className="mt-1 text-sm text-zinc-500">New supported bank notifications will appear here.</p></div>}</div>
}

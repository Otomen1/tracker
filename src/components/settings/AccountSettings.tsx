"use client"

import { useState } from "react"
import { useAccounts } from "@/context/AccountsContext"
import { useToast } from "@/context/ToastContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AccountSettings() {
  const { accounts, updateAccount } = useAccounts()
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState<Record<string, { name: string; openingBalance: string }>>({})
  if (!accounts.length) return <p className="text-sm text-zinc-500">Accounts are created during Android setup.</p>
  return <div className="space-y-3">{accounts.map((account) => {
    const draft = drafts[account.id] ?? { name: account.name, openingBalance: String(account.openingBalance) }
    const save = () => {
      const balance = Number(draft.openingBalance)
      if (!Number.isFinite(balance)) return showToast("Enter a valid opening balance.", "error")
      if (updateAccount(account.id, { name: draft.name.trim() || account.name, openingBalance: balance })) showToast(`${draft.name || account.name} updated`, "success")
      else showToast("Account could not be saved.", "error")
    }
    return <div key={account.id} className="grid gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:grid-cols-[1fr_9rem_auto] sm:items-end"><label className="space-y-1 text-xs text-zinc-500">Account name<Input value={draft.name} onChange={(e) => setDrafts((current) => ({ ...current, [account.id]: { ...draft, name: e.target.value } }))} /></label><label className="space-y-1 text-xs text-zinc-500">Opening balance<Input inputMode="decimal" value={draft.openingBalance} onChange={(e) => setDrafts((current) => ({ ...current, [account.id]: { ...draft, openingBalance: e.target.value } }))} /></label><div className="flex gap-2"><Button type="button" variant="outline" onClick={save}>Save</Button><Button type="button" variant="ghost" onClick={() => updateAccount(account.id, { isActive: !account.isActive })}>{account.isActive ? "Disable" : "Enable"}</Button></div></div>
  })}</div>
}

"use client"

import { useDraftGuard } from "@/hooks/useDraftGuard"
import { canLeaveScreen } from "@/lib/navigationGuard"
import { useRef, useState } from "react"
import { useAccounts, type AccountInput } from "@/context/AccountsContext"
import { useSettingsContext } from "@/context/SettingsContext"
import { useVault } from "@/context/VaultContext"
import type { Account, AccountKind } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function AccountEditor({ account, onDone }: { account?: Account; onDone?: () => void }) {
  const { accounts, addAccount, updateAccount } = useAccounts()
  const { settings } = useSettingsContext()
  const { error: storageError } = useVault()
  const [name, setName] = useState(account?.name ?? "")
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "bank")
  const [busy, setBusy] = useState(false)
  const saving = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  useDraftGuard(name !== (account?.name ?? "") || kind !== (account?.kind ?? "bank"), busy)
  const currency = account?.currency ?? accounts[0]?.currency ?? settings.currency
  return <form aria-label={account ? `Edit account ${account.name}` : "New account"} className="space-y-3" onSubmit={async event => {
    event.preventDefault()
    if (saving.current) return
    saving.current = true; setBusy(true); setError(null); setSaved(false)
    try {
      const input: AccountInput = { name: name.trim(), kind, currency, isActive: account?.isActive ?? true }
      if (!(account ? await updateAccount(account.id, input) : await addAccount(input))) throw new Error("Could not save source. Retry.")
      setSaved(true); onDone?.()
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save.") }
    finally { saving.current = false; setBusy(false) }
  }}>
    <fieldset disabled={busy} className="space-y-3">
      <label className="block text-sm">Account name<Input value={name} maxLength={60} required onChange={e => setName(e.target.value)} /></label>
      <label className="block text-sm">Account kind<select className="min-h-12 w-full rounded-md border bg-background px-3" value={kind} onChange={e => setKind(e.target.value as AccountKind)} disabled={!!account}>
        <option value="bank">Bank</option><option value="cash">Cash</option><option value="ewallet">E-wallet</option><option value="credit_card">Credit card</option>
      </select></label>
      <p className="text-xs text-muted-foreground">Transaction currency: {currency}. This source identifies recorded activity; no balance, assets or card debt is calculated.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error} {storageError}</p>}
      {saved && <p role="status" className="text-sm text-emerald-700">Source saved.</p>}
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : account ? "Save changes" : "Create account"}</Button>
    </fieldset>
  </form>
}

function AccountCard({ account }: { account: Account }) {
  const { updateAccount } = useAccounts()
  const { error: storageError } = useVault()
  const [busy, setBusy] = useState(false)
  const guard = useRef(false)
  const [error, setError] = useState<string | null>(null)
  useDraftGuard(false, busy)
  const capture = account.id === "account_ryt" || account.id === "account_maybank"
  return <section id={account.id} className="scroll-mt-5 space-y-3 rounded-xl border bg-background p-4">
    <div className="flex justify-between gap-3"><h2 className="font-semibold">{account.name}</h2><span className="text-xs">{account.isActive ? "Active" : "Archived"}</span></div>
    <p className="text-xs text-muted-foreground">{capture ? "Ryt/MAE notification source. Enable capture in Bank capture on Android." : "Manual transaction source. Automatic notification capture is not configured for this source."}</p>
    <details><summary className="min-h-12 cursor-pointer py-3 text-sm font-medium">Edit source</summary><AccountEditor account={account} /></details>
    <Button variant="outline" disabled={busy} onClick={async () => {
      if (guard.current) return
      if (account.isActive && !window.confirm("Archive source? Transactions stay. Turn off recurring entries first. Disable its bank capture separately if needed.")) return
      guard.current = true; setBusy(true); setError(null)
      try { if (!await updateAccount(account.id, { isActive: !account.isActive })) setError("Could not update source. Check recurring entries and retry.") }
      finally { guard.current = false; setBusy(false) }
    }}>{busy ? "Saving…" : account.isActive ? "Archive source" : "Reactivate source"}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error} {storageError}</p>}
  </section>
}

export function AccountSettings() {
  const { accounts } = useAccounts()
  const [adding, setAdding] = useState(false)
  return <div className="space-y-4">
    <p className="text-sm text-muted-foreground">Keep a source for each bank, card, wallet or cash you use. Automatic capture supports Ryt and MAE only; other sources need manual entries.</p>
    <Button onClick={() => { if (!adding || canLeaveScreen()) setAdding(v => !v) }}>{adding ? "Close new account" : "Add account"}</Button>
    {adding && <section className="rounded-xl border p-4"><AccountEditor onDone={() => setAdding(false)} /></section>}
    {accounts.map(account => <AccountCard key={account.id} account={account} />)}
  </div>
}

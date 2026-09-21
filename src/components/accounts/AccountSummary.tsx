"use client"

import { Landmark } from "lucide-react"
import { useAccounts } from "@/context/AccountsContext"
import { useTransactions } from "@/hooks/useTransactions"
import { useSettingsContext } from "@/context/SettingsContext"

export function AccountSummary() {
  const { accounts, getBalance } = useAccounts()
  const { transactions } = useTransactions()
  const { fmt } = useSettingsContext()
  const active = accounts.filter((account) => account.isActive)
  if (!active.length) return null
  return (
    <section aria-labelledby="accounts-heading">
      <div className="mb-2 flex items-center justify-between"><h2 id="accounts-heading" className="text-sm font-semibold">Accounts</h2><span className="text-xs text-zinc-500">Calculated balance</span></div>
      <div className="grid grid-cols-2 gap-3">
        {active.map((account) => <div key={account.id} className="rounded-xl border border-zinc-200 bg-white p-3.5 dark:border-zinc-800 dark:bg-zinc-900"><div className="flex items-center gap-2 text-xs text-zinc-500"><Landmark className="h-4 w-4" />{account.name}</div><p className="mt-2 text-lg font-bold tracking-tight">{fmt(getBalance(account.id, transactions))}</p></div>)}
      </div>
    </section>
  )
}

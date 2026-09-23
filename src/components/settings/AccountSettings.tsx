"use client"

import { useState } from "react"
import { useAccounts, calculateAccountBalance } from "@/context/AccountsContext"
import { useTransactions } from "@/hooks/useTransactions"
import { useSettingsContext } from "@/context/SettingsContext"
import { useToast } from "@/context/ToastContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AccountSettings() {
  const { accounts, updateAccount } = useAccounts()
  const { transactions } = useTransactions()
  const { fmt } = useSettingsContext()
  const { showToast } = useToast()
  const [drafts, setDrafts] = useState<Record<string, { name: string; openingBalance: string }>>({})
  if (!accounts.length) return <p className="text-sm text-zinc-600 dark:text-zinc-400">Accounts are created during Android setup. Your browser data stays separate.</p>

  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const draft = drafts[account.id] ?? { name: account.name, openingBalance: String(account.openingBalance) }
        const currentBalance = calculateAccountBalance(account, transactions)
        const setDraft = (patch: Partial<typeof draft>) => setDrafts((current) => ({
          ...current,
          [account.id]: { ...draft, ...patch },
        }))
        const save = () => {
          const balance = Number(draft.openingBalance)
          if (!draft.name.trim()) return showToast("Enter an account name.", "error")
          if (!Number.isFinite(balance)) return showToast("Enter a valid opening balance.", "error")
          if (updateAccount(account.id, { name: draft.name.trim(), openingBalance: balance })) {
            showToast(`${draft.name.trim()} updated`, "success")
          } else {
            showToast("Account could not be saved.", "error")
          }
        }
        const toggleActive = () => {
          const nextActive = !account.isActive
          if (updateAccount(account.id, { isActive: nextActive })) showToast(nextActive ? "Account enabled" : "Account disabled", "success")
          else showToast("Account could not be updated.", "error")
        }

        return (
          <section key={account.id} aria-label={`${account.name} account settings`} className="space-y-3 rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-700 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{account.name}</p>
                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">Current balance</p>
              </div>
              <div className="text-right">
                <p className="text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{fmt(currentBalance)}</p>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${account.isActive ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"}`}>
                  {account.isActive ? "Active" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
              <label className="space-y-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Account name
                <Input className="min-h-11" value={draft.name} onChange={(event) => setDraft({ name: event.target.value })} />
              </label>
              <label className="space-y-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Opening balance ({account.currency})
                <Input className="min-h-11 tabular-nums" inputMode="decimal" value={draft.openingBalance} onChange={(event) => setDraft({ openingBalance: event.target.value })} />
              </label>
            </div>
            <p className="text-xs leading-5 text-zinc-600 dark:text-zinc-400">The current balance above is calculated from this starting amount and confirmed transactions.</p>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button className="min-h-11" type="button" variant="outline" onClick={toggleActive}>{account.isActive ? "Disable account" : "Enable account"}</Button>
              <Button className="min-h-11" type="button" onClick={save}>Save changes</Button>
            </div>
          </section>
        )
      })}
    </div>
  )
}

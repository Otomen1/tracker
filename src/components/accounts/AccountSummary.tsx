"use client"

import Link from "next/link"
import { buildTransactionsDeepLink } from "@/lib/deepLinks"
import { Landmark } from "lucide-react"
import { useAccounts } from "@/context/AccountsContext"
import { useTransactions } from "@/hooks/useTransactions"
import { accountActivity } from "@/domain/finance"

export function AccountSummary({ month }: { month: string }) {
  const { accounts } = useAccounts()
  const { transactions } = useTransactions()
  if (!accounts.length) return null
  return <section aria-labelledby="accounts-heading">
    <div className="mb-2 flex items-center justify-between"><h2 id="accounts-heading" className="text-sm font-semibold">Activity by source</h2><span className="text-xs text-zinc-500">Recorded this month</span></div>
    <div className="flex gap-3 overflow-x-auto pb-2">{accounts.map(account => {
      const activity = accountActivity(account.id, transactions, month)
      if (!account.isActive && !activity.count) return null
      const fmt = (amount: number) => new Intl.NumberFormat("en-MY", { style: "currency", currency: account.currency }).format(amount)
      return <Link href={buildTransactionsDeepLink({ accountId: account.id, dateFrom: `${month}-01`, dateTo: `${month}-31` })} key={account.id} className="min-w-44 shrink-0 rounded-xl border bg-background p-3.5">
        <div className="flex items-center gap-2 text-xs text-zinc-500"><Landmark className="h-4 w-4" />{account.name}</div>
        <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-400">In {fmt(activity.incoming)}</p><p className="text-sm text-rose-600 dark:text-rose-400">Out {fmt(activity.outgoing)}</p><p className="mt-1 text-xs text-muted-foreground">{activity.count} recorded transactions</p>
      </Link>
    })}</div>
    <p className="text-xs text-muted-foreground">Includes each source’s side of transfers. These are recorded movements, not account balances.</p>
  </section>
}

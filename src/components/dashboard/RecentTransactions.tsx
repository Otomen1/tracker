"use client"

import Link from "next/link"
import { Transaction, Category } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/formatters"
import { useSettingsContext } from "@/context/SettingsContext"
import { ArrowLeftRight, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { EmptyState } from "@/components/ui/empty-state"

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function RecentTransactions({ transactions, categories }: Props) {
  const { fmt } = useSettingsContext()

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Recent Transactions</CardTitle>
        <Link href="/transactions" className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors">
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No recent activity"
            description="Your latest income and expenses will appear here."
            action={{ label: "Add transaction", href: "/transactions" }}
            className="py-7"
          />
        ) : (
          <div>
            {transactions.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId)
              return (
                <div key={t.id} className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: cat?.color ?? "#6b7280" }}
                    >
                      {t.description.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-none">{t.description}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{t.type === "transfer" ? "Internal transfer" : cat?.name} · {formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span className={cn("text-sm font-semibold whitespace-nowrap", t.type === "income" ? "text-emerald-600" : t.type === "expense" ? "text-rose-500" : "text-zinc-600 dark:text-zinc-300")}>
                    {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}{fmt(t.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

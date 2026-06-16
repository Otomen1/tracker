"use client"

import { Transaction, Category } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/formatters"
import { useSettingsContext } from "@/context/SettingsContext"
import { cn } from "@/lib/utils"

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function TopTransactions({ transactions, categories }: Props) {
  const { fmt } = useSettingsContext()

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Top Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No transactions this month</p>
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
                      <p className="text-xs text-zinc-400 mt-0.5">{cat?.name} · {formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span className={cn("text-sm font-semibold whitespace-nowrap", t.type === "income" ? "text-emerald-600" : "text-rose-500")}>
                    {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
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

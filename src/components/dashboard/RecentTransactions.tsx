"use client"

import Link from "next/link"
import { Transaction, Category } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDate } from "@/lib/formatters"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function RecentTransactions({ transactions, categories }: Props) {
  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-semibold text-zinc-700">Recent Transactions</CardTitle>
        <Link
          href="/transactions"
          className="text-xs text-zinc-400 hover:text-zinc-900 flex items-center gap-1 transition-colors"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-zinc-400 py-4 text-center">No transactions yet</p>
        ) : (
          <div className="space-y-0">
            {transactions.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId)
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between py-3 border-b border-zinc-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: cat?.color ?? "#6b7280" }}
                    >
                      {t.description.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900 leading-none">
                        {t.description}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {cat?.name} · {formatDate(t.date)}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold whitespace-nowrap",
                      t.type === "income" ? "text-emerald-600" : "text-rose-500"
                    )}
                  >
                    {t.type === "income" ? "+" : "-"}
                    {formatCurrency(t.amount)}
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

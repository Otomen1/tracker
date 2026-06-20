"use client"

import { memo } from "react"
import Link from "next/link"
import { BudgetStatus } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettingsContext } from "@/context/SettingsContext"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  budgets: BudgetStatus[]
}

export const BudgetProgressCard = memo(function BudgetProgressCard({ budgets }: Props) {
  const { fmt } = useSettingsContext()

  if (budgets.length === 0) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="py-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">No budget limits set</span>
          <Link
            href="/settings"
            className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 underline underline-offset-2 transition-colors"
          >
            Set limits in Settings →
          </Link>
        </CardContent>
      </Card>
    )
  }

  const overBudgetCount = budgets.filter((b) => b.isOverBudget).length

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Budget Tracker</CardTitle>
          {overBudgetCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-rose-500 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {overBudgetCount} over budget
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {budgets.map((b) => (
          <div key={b.categoryId}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 font-medium">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                {b.categoryName}
              </span>
              <span className={cn("font-medium", b.isOverBudget ? "text-rose-500" : "text-zinc-500 dark:text-zinc-400")}>
                {fmt(b.spent)} / {fmt(b.budget)}
              </span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
              <div
                role="progressbar"
                aria-valuenow={Math.min(b.percentage, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${b.categoryName} budget progress`}
                className={cn("h-1.5 rounded-full transition-all", b.isOverBudget ? "bg-rose-500" : b.percentage > 80 ? "bg-amber-400" : "bg-emerald-500")}
                style={{ width: `${Math.min(b.percentage, 100)}%` }}
              />
            </div>
            {b.isOverBudget && (
              <p className="text-xs text-rose-500 mt-0.5">{fmt(b.spent - b.budget)} over budget</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
})

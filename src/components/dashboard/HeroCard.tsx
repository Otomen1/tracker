"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Status, type StatusTone } from "@/components/ui/status"
import { Insight, DashboardStats, BudgetStatus } from "@/types"
import { cn } from "@/lib/utils"

const INSIGHT_TONE: Record<Insight["type"], StatusTone> = {
  positive: "good",
  negative: "critical",
  warning: "warning",
  neutral: "neutral",
}

interface Props {
  stats: DashboardStats
  monthLabel: string
  overBudgetCategories: BudgetStatus[]
  topInsight?: Insight
  fmt: (n: number) => string
}

export function HeroCard({ stats, monthLabel, overBudgetCategories, topInsight, fmt }: Props) {
  const isPositive = stats.currentMonthNet > 0
  const isZero = stats.currentMonthNet === 0

  let tone: StatusTone = "neutral"
  let label = stats.transactionCountThisMonth === 0
    ? "Add your first transaction to start this month’s overview"
    : "Spending is tracking normally this month"

  if (overBudgetCategories.length > 0) {
    tone = "critical"
    label = `${overBudgetCategories.map((b) => b.categoryName).join(", ")} ${overBudgetCategories.length === 1 ? "is" : "are"} over budget`
  } else if (topInsight) {
    tone = INSIGHT_TONE[topInsight.type]
    label = topInsight.title
  }

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-5 sm:p-6">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">{monthLabel} · Net</p>
        <p className={cn("mt-1 text-4xl font-bold tracking-tight sm:text-5xl", isZero ? "text-zinc-900 dark:text-zinc-100" : isPositive ? "text-emerald-600" : "text-rose-500")}>
          {isPositive ? "+" : ""}{fmt(stats.currentMonthNet)}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          {fmt(stats.currentMonthIncome)} in · {fmt(stats.currentMonthExpenses)} out
        </p>
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <Status tone={tone} label={label} />
        </div>
      </CardContent>
    </Card>
  )
}

import Link from "next/link"
import { AlertTriangle, ArrowRight, CircleCheck, Target } from "lucide-react"
import { BudgetStatus, Insight } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Props {
  budgets: BudgetStatus[]
  insights: Insight[]
  currentNet: number
  savingsGoal: number
  fmt: (value: number) => string
}

export function NeedsAttention({ budgets, insights, currentNet, savingsGoal, fmt }: Props) {
  const overBudget = budgets.filter((budget) => budget.isOverBudget)
  const concern = insights.find((insight) => insight.type === "negative" || insight.type === "warning")
  const savingsGap = savingsGoal > 0 ? savingsGoal - currentNet : 0

  const items = [
    ...overBudget.slice(0, 2).map((budget) => ({
      id: `budget-${budget.categoryId}`,
      icon: AlertTriangle,
      title: `${budget.categoryName} is over budget`,
      detail: `${fmt(budget.spent - budget.budget)} above the monthly limit`,
      tone: "text-rose-500",
    })),
    ...(concern ? [{ id: concern.id, icon: AlertTriangle, title: concern.title, detail: concern.detail, tone: "text-amber-500" }] : []),
    ...(savingsGoal > 0 && savingsGap > 0 ? [{
      id: "savings-gap",
      icon: Target,
      title: `${fmt(savingsGap)} to reach your savings goal`,
      detail: "Keep an eye on discretionary spending for the rest of the month.",
      tone: "text-zinc-500",
    }] : []),
  ].slice(0, 3)

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="flex flex-row items-center justify-between p-5 pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Needs attention</CardTitle>
        <Link href="/analytics" className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50">
          View analytics <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="p-5 pt-2">
        {items.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300">
            <CircleCheck className="h-4 w-4 text-emerald-500" />
            Nothing needs action right now.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {items.map(({ id, icon: Icon, title, detail, tone }) => (
              <div key={id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">{title}</p>
                  {detail && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{detail}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


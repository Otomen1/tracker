"use client"

import { Insight } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { statusConfig, type StatusTone } from "@/components/ui/status"
import { formatMonth } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const INSIGHT_TONE: Record<Insight["type"], StatusTone> = {
  positive: "good",
  negative: "critical",
  warning: "warning",
  neutral: "neutral",
}

interface Props {
  insights: Insight[]
  selectedMonth: string
}

export function SpendingInsightsCard({ insights, selectedMonth }: Props) {
  if (insights.length === 0) return null

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Spending Insights
          </CardTitle>
          <span className="text-xs text-zinc-400">{formatMonth(selectedMonth)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight) => {
          const { icon: Icon, className } = statusConfig[INSIGHT_TONE[insight.type]]
          return (
            <div key={insight.id} className="flex items-start gap-2.5">
              <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", className)} />
              <div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {insight.title}
                </p>
                {insight.detail && (
                  <p className="text-xs text-zinc-400 mt-0.5">{insight.detail}</p>
                )}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

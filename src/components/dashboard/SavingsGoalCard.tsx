"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Target } from "lucide-react"
import { useSettingsContext } from "@/context/SettingsContext"
import { cn } from "@/lib/utils"

interface Props {
  currentNet: number
}

export function SavingsGoalCard({ currentNet }: Props) {
  const { settings, fmt } = useSettingsContext()
  const goal = settings.monthlySavingsGoal

  if (!goal || goal <= 0) return null

  const percentage = Math.min((currentNet / goal) * 100, 100)
  const isAchieved = currentNet >= goal
  const isBehind = currentNet < 0

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="pt-5 pb-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Savings Goal</span>
          </div>
          <div className="text-right">
            <span className={cn("text-sm font-semibold", isAchieved ? "text-emerald-600" : isBehind ? "text-rose-500" : "text-zinc-900 dark:text-zinc-100")}>
              {fmt(Math.max(currentNet, 0))}
            </span>
            <span className="text-xs text-zinc-400 ml-1">/ {fmt(goal)}</span>
          </div>
        </div>
        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2">
          <div
            className={cn("h-2 rounded-full transition-all", isAchieved ? "bg-emerald-500" : isBehind ? "bg-rose-400" : "bg-zinc-900 dark:bg-zinc-100")}
            style={{ width: `${Math.max(percentage, 0)}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400 mt-1.5">
          {isAchieved
            ? `Goal achieved! ${fmt(currentNet - goal)} over target`
            : isBehind
              ? "Spending exceeds income this month"
              : `${fmt(goal - currentNet)} more to reach goal (${percentage.toFixed(0)}%)`}
        </p>
      </CardContent>
    </Card>
  )
}

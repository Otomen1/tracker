"use client"

import { DashboardStats } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { formatCurrency } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface Props {
  stats: DashboardStats
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const diff = ((current - previous) / previous) * 100
  const isUp = diff > 0
  const isNeutral = Math.abs(diff) < 0.5

  if (isNeutral) return null

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium gap-0.5",
        isUp ? "text-emerald-600" : "text-rose-500"
      )}
    >
      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(diff).toFixed(1)}%
    </span>
  )
}

export function StatsCards({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="border-zinc-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Income</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(stats.currentMonthIncome)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="mt-2">
            <TrendBadge
              current={stats.currentMonthIncome}
              previous={stats.previousMonthIncome}
            />
            {stats.previousMonthIncome > 0 && (
              <span className="text-xs text-zinc-400 ml-1">vs last month</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Expenses</p>
              <p className="text-2xl font-bold text-rose-500 mt-1">
                {formatCurrency(stats.currentMonthExpenses)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <div className="mt-2">
            <TrendBadge
              current={stats.currentMonthExpenses}
              previous={stats.previousMonthExpenses}
            />
            {stats.previousMonthExpenses > 0 && (
              <span className="text-xs text-zinc-400 ml-1">vs last month</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-zinc-200">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Net Balance</p>
              <p
                className={cn(
                  "text-2xl font-bold mt-1",
                  stats.currentMonthNet >= 0 ? "text-zinc-900" : "text-rose-500"
                )}
              >
                {stats.currentMonthNet >= 0 ? "+" : ""}
                {formatCurrency(stats.currentMonthNet)}
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center">
              <Minus className="w-4 h-4 text-zinc-600" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xs text-zinc-400">
              {stats.transactionCountThisMonth} transaction{stats.transactionCountThisMonth !== 1 ? "s" : ""} this month
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

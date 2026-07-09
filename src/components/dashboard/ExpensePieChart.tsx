"use client"

import { memo } from "react"
import { CategoryBreakdown } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useSettingsContext } from "@/context/SettingsContext"
import { PIE_CHART_MAX_CATEGORIES } from "@/lib/constants"

interface TooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
}

function PieTooltip({ active, payload, fmt }: TooltipProps & { fmt: (n: number) => string }) {
  if (!active || !payload?.length) return null
  const item = payload[0].payload as CategoryBreakdown
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{item.categoryName}</p>
      <p className="text-zinc-600 dark:text-zinc-400">{fmt(item.total)}</p>
      <p className="text-zinc-400">{item.percentage.toFixed(1)}%</p>
    </div>
  )
}

interface Props {
  data: CategoryBreakdown[]
  title?: string
  emptyMessage?: string
  ariaLabel?: string
  tableCaption?: string
}

export const ExpensePieChart = memo(function ExpensePieChart({
  data,
  title = "Expenses by Category",
  emptyMessage = "No expenses this month",
  ariaLabel = "Pie chart showing expense breakdown by category",
  tableCaption = "Expense breakdown by category",
}: Props) {
  const { fmt } = useSettingsContext()

  if (data.length === 0) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">{emptyMessage}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data} cx="50%" cy="45%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="total" nameKey="categoryName">
                {data.map((entry) => (
                  <Cell key={entry.categoryId} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={(props) => <PieTooltip {...props} fmt={fmt} />} />
              <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-xs text-zinc-600 dark:text-zinc-400">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 space-y-1">
          {data.slice(0, PIE_CHART_MAX_CATEGORIES).map((item) => (
            <div key={item.categoryId} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.categoryName}
              </span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium">{fmt(item.total)}</span>
            </div>
          ))}
        </div>
        <table className="sr-only">
          <caption>{tableCaption}</caption>
          <thead><tr><th>Category</th><th>Amount</th><th>Percentage</th></tr></thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.categoryId}>
                <td>{item.categoryName}</td>
                <td>{fmt(item.total)}</td>
                <td>{item.percentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
})

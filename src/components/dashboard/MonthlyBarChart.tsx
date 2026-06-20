"use client"

import { memo } from "react"
import { MonthlySummary } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useSettingsContext } from "@/context/SettingsContext"
import { formatShortMonth } from "@/lib/formatters"

interface BarTooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  fmt: (n: number) => string
}

function BarTooltip({ active, payload, label, fmt }: BarTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</p>
      {payload.map((p: { name: string; value: number }) => (
        <p key={p.name} className="text-zinc-600 dark:text-zinc-400">
          <span className="capitalize">{p.name}</span>: <span className="font-medium">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  )
}

interface Props { data: MonthlySummary[] }

export const MonthlyBarChart = memo(function MonthlyBarChart({ data }: Props) {
  const { fmt } = useSettingsContext()

  const chartData = data.map((d) => ({
    month: formatShortMonth(d.month),
    income: d.totalIncome,
    expenses: d.totalExpenses,
  }))

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">6-Month Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Bar chart showing income and expenses over the last 6 months">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={16} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip content={(props) => <BarTooltip {...props} fmt={fmt} />} cursor={{ fill: "#f4f4f5" }} />
              <Bar dataKey="income" name="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-1 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Income</span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />Expenses</span>
        </div>
        <table className="sr-only">
          <caption>Income and expenses over the last 6 months</caption>
          <thead><tr><th>Month</th><th>Income</th><th>Expenses</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <td>{formatShortMonth(d.month)}</td>
                <td>{fmt(d.totalIncome)}</td>
                <td>{fmt(d.totalExpenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
})

"use client"

import { memo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { MonthlySummary } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useSettingsContext } from "@/context/SettingsContext"
import { formatShortMonth } from "@/lib/formatters"
import { getPeriodDateRange } from "@/lib/analytics"
import { buildTransactionsDeepLink } from "@/lib/deepLinks"

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

interface Props {
  data: MonthlySummary[]
  title?: string
  ariaLabel?: string
  tableCaption?: string
  // When true, bars and an accessible per-month link list navigate to
  // Transactions filtered to that month + income/expense. Omitted by
  // default so any existing usage is unaffected.
  enableDeepLinks?: boolean
}

export const MonthlyBarChart = memo(function MonthlyBarChart({
  data,
  title = "6-Month Overview",
  ariaLabel = "Bar chart showing income and expenses over the last 6 months",
  tableCaption = "Income and expenses over the last 6 months",
  enableDeepLinks = false,
}: Props) {
  const { fmt } = useSettingsContext()
  const router = useRouter()

  const chartData = data.map((d) => ({
    monthKey: d.month,
    month: formatShortMonth(d.month),
    income: d.totalIncome,
    expenses: d.totalExpenses,
  }))

  const handleBarClick = (type: "income" | "expenses", entry?: { monthKey: string }) => {
    if (!enableDeepLinks || !entry) return
    const range = getPeriodDateRange(entry.monthKey)
    router.push(buildTransactionsDeepLink({ type: type === "income" ? "income" : "expense", ...range }))
  }

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={ariaLabel}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={16} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
              <Tooltip content={(props) => <BarTooltip {...props} fmt={fmt} />} cursor={{ fill: "#f4f4f5" }} />
              <Bar
                dataKey="income"
                name="income"
                fill="#22c55e"
                radius={[3, 3, 0, 0]}
                onClick={(entry) => handleBarClick("income", entry)}
                cursor={enableDeepLinks ? "pointer" : undefined}
              />
              <Bar
                dataKey="expenses"
                name="expenses"
                fill="#f43f5e"
                radius={[3, 3, 0, 0]}
                onClick={(entry) => handleBarClick("expenses", entry)}
                cursor={enableDeepLinks ? "pointer" : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-1 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Income</span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />Expenses</span>
        </div>

        {enableDeepLinks && (
          <div className="mt-3 space-y-1">
            {chartData.map((d) => {
              const range = getPeriodDateRange(d.monthKey)
              return (
                <div key={d.monthKey} className="flex items-center justify-between text-xs gap-2">
                  <span className="text-zinc-600 dark:text-zinc-400">{d.month}</span>
                  <span className="flex items-center gap-3">
                    <Link
                      href={buildTransactionsDeepLink({ type: "income", ...range })}
                      aria-label={`View income transactions for ${d.month}`}
                      className="text-emerald-600 dark:text-emerald-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {fmt(d.income)}
                    </Link>
                    <Link
                      href={buildTransactionsDeepLink({ type: "expense", ...range })}
                      aria-label={`View expense transactions for ${d.month}`}
                      className="text-rose-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    >
                      {fmt(d.expenses)}
                    </Link>
                  </span>
                </div>
              )
            })}
          </div>
        )}

        <table className="sr-only">
          <caption>{tableCaption}</caption>
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

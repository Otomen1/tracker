"use client"

import { AnnualSummary as AnnualSummaryType } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettingsContext } from "@/context/SettingsContext"
import { useRouter } from "next/navigation"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { formatShortMonth } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

interface AnnualBarTooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  fmt: (n: number) => string
}

function AnnualBarTooltip({ active, payload, label, fmt }: AnnualBarTooltipProps) {
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

function YoYBadge({ current, prev, label }: { current: number; prev: number; label: string }) {
  if (prev === 0) return null
  const pct = ((current - prev) / prev) * 100
  const up = pct >= 0
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className="text-zinc-400">{label} vs {}</span>
      <span className={cn("font-medium", up ? "text-emerald-600" : "text-rose-500")}>
        {up ? "+" : ""}{pct.toFixed(1)}%
      </span>
    </div>
  )
}

interface Props {
  summary: AnnualSummaryType
  prevYearSummary: AnnualSummaryType | null
}

export function AnnualSummaryView({ summary, prevYearSummary }: Props) {
  const { fmt } = useSettingsContext()
  const router = useRouter()

  const chartData = summary.monthlyBreakdown.map((m) => ({
    month: MONTH_NAMES[parseInt(m.month.slice(5)) - 1],
    income: m.totalIncome,
    expenses: m.totalExpenses,
  }))

  const avgMonthlyExpenses = summary.totalExpenses / 12

  return (
    <div className="space-y-6">
      {/* Year-over-year comparison */}
      {prevYearSummary && (
        <Card className="border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">vs {prevYearSummary.year}</p>
            <div className="flex flex-wrap gap-4">
              <YoYBadge current={summary.totalIncome} prev={prevYearSummary.totalIncome} label="Income" />
              <YoYBadge current={summary.totalExpenses} prev={prevYearSummary.totalExpenses} label="Expenses" />
              <YoYBadge current={summary.netBalance} prev={prevYearSummary.netBalance} label="Net" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Income", value: fmt(summary.totalIncome), color: "text-emerald-600" },
          { label: "Total Expenses", value: fmt(summary.totalExpenses), color: "text-rose-500" },
          { label: "Net Saved", value: `${summary.netBalance >= 0 ? "+" : ""}${fmt(summary.netBalance)}`, color: summary.netBalance >= 0 ? "text-zinc-900 dark:text-zinc-100" : "text-rose-500" },
          { label: "Avg Monthly Spend", value: fmt(avgMonthlyExpenses), color: "text-zinc-700 dark:text-zinc-300" },
        ].map(({ label, value, color }) => (
          <Card key={label} className="border-zinc-200 dark:border-zinc-800">
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
              <p className={cn("text-xl font-bold mt-1", color)}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Annual bar chart */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{summary.year} Monthly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="img" aria-label={`Bar chart showing monthly income and expenses for ${summary.year}`}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} barSize={14} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
                <Tooltip content={(props) => <AnnualBarTooltip {...props} fmt={fmt} />} cursor={{ fill: "#f4f4f5" }} />
                <Bar dataKey="income" name="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>{summary.year} monthly income and expenses</caption>
            <thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
            <tbody>
              {summary.monthlyBreakdown.map((m, i) => (
                <tr key={m.month}>
                  <td>{MONTH_NAMES[i]}</td>
                  <td>{fmt(m.totalIncome)}</td>
                  <td>{fmt(m.totalExpenses)}</td>
                  <td>{fmt(m.netBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Monthly table */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Month-by-Month</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-left">Month</th>
                  <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-right">Income</th>
                  <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-right">Expenses</th>
                  <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-right">Net</th>
                  <th scope="col" className="py-3 px-4 text-xs font-medium text-zinc-500 text-right hidden sm:table-cell">Txns</th>
                </tr>
              </thead>
              <tbody>
                {summary.monthlyBreakdown.map((m, i) => (
                  <tr
                    key={m.month}
                    onClick={() => router.push(`/monthly?month=${m.month}`)}
                    className="border-b border-zinc-100 dark:border-zinc-800 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                  >
                    <td className="py-3 px-4 text-sm text-zinc-900 dark:text-zinc-100 font-medium">{MONTH_NAMES[i]}</td>
                    <td className="py-3 px-4 text-sm text-emerald-600 text-right">{m.totalIncome > 0 ? fmt(m.totalIncome) : "—"}</td>
                    <td className="py-3 px-4 text-sm text-rose-500 text-right">{m.totalExpenses > 0 ? fmt(m.totalExpenses) : "—"}</td>
                    <td className={cn("py-3 px-4 text-sm font-medium text-right", m.netBalance >= 0 ? "text-zinc-900 dark:text-zinc-100" : "text-rose-500")}>
                      {m.transactionCount === 0 ? "—" : `${m.netBalance >= 0 ? "+" : ""}${fmt(m.netBalance)}`}
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400 text-right hidden sm:table-cell">{m.transactionCount || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top categories */}
      {summary.topExpenseCategories.length > 0 && (
        <Card className="border-zinc-200 dark:border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Top Expense Categories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.topExpenseCategories.slice(0, 5).map((cat) => (
              <div key={cat.categoryId}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                    {cat.categoryName}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{fmt(cat.total)} <span className="text-zinc-400">({cat.percentage.toFixed(1)}%)</span></span>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min(cat.percentage, 100)}%`, backgroundColor: cat.color }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

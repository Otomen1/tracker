"use client"

import { MonthlySummary } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"
import { useSettingsContext } from "@/context/SettingsContext"
import { formatShortMonth } from "@/lib/formatters"

interface Props { data: MonthlySummary[] }

export function MonthlyBarChart({ data }: Props) {
  const { fmt } = useSettingsContext()

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-sm text-sm">
        <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} className="text-zinc-600 dark:text-zinc-400">
            <span className="capitalize">{p.name}</span>: <span className="font-medium">{fmt(p.value)}</span>
          </p>
        ))}
      </div>
    )
  }

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
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barSize={16} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={36} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f4f4f5" }} />
            <Bar dataKey="income" name="income" fill="#22c55e" radius={[3, 3, 0, 0]} />
            <Bar dataKey="expenses" name="expenses" fill="#f43f5e" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-1 justify-center">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Income</span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />Expenses</span>
        </div>
      </CardContent>
    </Card>
  )
}

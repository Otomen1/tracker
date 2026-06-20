"use client"

import { memo } from "react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettingsContext } from "@/context/SettingsContext"

interface DataPoint {
  month: string
  balance: number
}

interface TooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  fmt: (n: number) => string
}

function NetTooltip({ active, payload, label, fmt }: TooltipProps) {
  if (!active || !payload?.length) return null
  const balance: number = payload[0].value
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</p>
      <p className={balance >= 0 ? "text-emerald-600" : "text-rose-500"}>
        {balance >= 0 ? "+" : ""}{fmt(balance)}
      </p>
    </div>
  )
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatMonthLabel(m: string): string {
  const [year, month] = m.split("-")
  return `${MONTH_NAMES[parseInt(month) - 1]} '${year.slice(2)}`
}

function tickFmt(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

interface Props {
  data: DataPoint[]
}

export const CumulativeNetChart = memo(function CumulativeNetChart({ data }: Props) {
  const { fmt } = useSettingsContext()

  if (data.length < 2) {
    return (
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Net Worth Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-400 py-8 text-center">Add transactions across multiple months to see your net worth trend.</p>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({ month: formatMonthLabel(d.month), balance: d.balance }))
  const latest = data[data.length - 1].balance

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Net Worth Over Time</CardTitle>
          <span className={`text-sm font-bold ${latest >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {latest >= 0 ? "+" : ""}{fmt(latest)}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div role="img" aria-label="Line chart showing cumulative net balance over time">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={tickFmt}
                width={36}
              />
              <ReferenceLine y={0} stroke="#d4d4d8" strokeDasharray="3 3" />
              <Tooltip content={(props) => <NetTooltip {...props} fmt={fmt} />} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "#3b82f6" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <caption>Cumulative net balance by month</caption>
          <thead><tr><th>Month</th><th>Net Balance</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}><td>{d.month}</td><td>{fmt(d.balance)}</td></tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
})

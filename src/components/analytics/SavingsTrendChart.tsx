"use client"

import { memo } from "react"
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSettingsContext } from "@/context/SettingsContext"
import { formatShortMonth } from "@/lib/formatters"
import { SavingsTrendResult } from "@/types"

const ACHIEVED_COLOR = "#22c55e" // emerald-500 - matches SavingsGoalCard's "achieved" state
const BEHIND_COLOR = "#f43f5e" // rose-500 - matches SavingsGoalCard's negative/behind state
const IN_PROGRESS_COLOR = "#71717a" // zinc-500 - neutral, positive but under goal (or no goal)

function tickFmt(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return `${v}`
}

interface ChartPoint {
  month: string
  actual: number
  goal: number
  achievementRate: number | null
}

interface TooltipProps {
  active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any[]
  label?: string
  fmt: (n: number) => string
}

function SavingsTooltip({ active, payload, label, fmt }: TooltipProps) {
  if (!active || !payload?.length) return null
  const point: ChartPoint = payload[0].payload
  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="font-medium text-zinc-700 dark:text-zinc-300 mb-1">{label}</p>
      <p className={point.actual >= 0 ? "text-emerald-600" : "text-rose-500"}>
        {point.actual >= 0 ? "+" : ""}{fmt(point.actual)}
      </p>
      {point.goal > 0 && (
        <p className="text-zinc-400">
          Goal: {fmt(point.goal)}
          {point.achievementRate !== null && ` (${point.achievementRate.toFixed(0)}%)`}
        </p>
      )}
    </div>
  )
}

function barColor(point: ChartPoint): string {
  if (point.actual < 0) return BEHIND_COLOR
  if (point.goal > 0 && point.actual >= point.goal) return ACHIEVED_COLOR
  return IN_PROGRESS_COLOR
}

interface Props {
  trend: SavingsTrendResult
}

export const SavingsTrendChart = memo(function SavingsTrendChart({ trend }: Props) {
  const { fmt } = useSettingsContext()

  const hasGoal = trend.points.length > 0 && trend.points[0].goal > 0
  const chartData: ChartPoint[] = trend.points.map((p) => ({
    month: formatShortMonth(p.month),
    actual: p.actual,
    goal: p.goal,
    achievementRate: p.achievementRate,
  }))

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Savings Trend</CardTitle>
        <p className="text-xs text-zinc-400">
          {hasGoal
            ? `Actual savings vs. current monthly goal of ${fmt(trend.points[0].goal)}`
            : "No savings goal configured — showing actual savings only"}
        </p>
      </CardHeader>
      <CardContent>
        <div
          role="img"
          aria-label={
            hasGoal
              ? "Bar chart comparing actual monthly savings to your current monthly goal"
              : "Bar chart showing actual savings by month"
          }
        >
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a1a1aa" }} axisLine={false} tickLine={false} tickFormatter={tickFmt} width={40} />
              <ReferenceLine y={0} stroke="#d4d4d8" />
              {hasGoal && (
                <ReferenceLine
                  y={chartData[0].goal}
                  stroke="#a1a1aa"
                  strokeDasharray="4 4"
                  label={{ value: "Goal", position: "insideTopRight", fontSize: 11, fill: "#a1a1aa" }}
                />
              )}
              <Tooltip content={(props) => <SavingsTooltip {...props} fmt={fmt} />} cursor={{ fill: "#f4f4f5" }} />
              <Bar dataKey="actual" radius={[3, 3, 3, 3]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={barColor(d)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {hasGoal && trend.achievementRate !== null && (
          <p className="text-xs text-center mt-1 text-zinc-500">
            Overall: {fmt(trend.totalActual)} of {fmt(trend.totalGoal)} goal ({trend.achievementRate.toFixed(0)}%)
          </p>
        )}

        <div className="flex items-center gap-4 mt-2 justify-center text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ACHIEVED_COLOR }} />Goal achieved</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: IN_PROGRESS_COLOR }} />In progress</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: BEHIND_COLOR }} />Negative</span>
        </div>

        <table className="sr-only">
          <caption>Actual savings vs. current monthly goal, by month</caption>
          <thead><tr><th>Month</th><th>Actual savings</th><th>Goal</th><th>Achievement</th></tr></thead>
          <tbody>
            {trend.points.map((p) => (
              <tr key={p.month}>
                <td>{formatShortMonth(p.month)}</td>
                <td>{fmt(p.actual)}</td>
                <td>{p.goal > 0 ? fmt(p.goal) : "No goal set"}</td>
                <td>{p.achievementRate !== null ? `${p.achievementRate.toFixed(0)}%` : "N/A"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
})

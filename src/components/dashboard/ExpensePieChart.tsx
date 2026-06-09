"use client"

import { CategoryBreakdown } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { formatCurrency } from "@/lib/formatters"

interface Props {
  data: CategoryBreakdown[]
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: CategoryBreakdown }[] }) => {
  if (!active || !payload?.length) return null
  const item = payload[0].payload
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-sm text-sm">
      <p className="font-medium text-zinc-900">{item.categoryName}</p>
      <p className="text-zinc-600">{formatCurrency(item.total)}</p>
      <p className="text-zinc-400">{item.percentage.toFixed(1)}%</p>
    </div>
  )
}

export function ExpensePieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <Card className="border-zinc-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700">Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-zinc-400 text-sm">
            No expenses this month
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-zinc-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-zinc-700">Expenses by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              dataKey="total"
              nameKey="categoryName"
            >
              {data.map((entry) => (
                <Cell key={entry.categoryId} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              formatter={(value) => (
                <span className="text-xs text-zinc-600">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-1 space-y-1">
          {data.slice(0, 4).map((item) => (
            <div key={item.categoryId} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-600">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.categoryName}
              </span>
              <span className="text-zinc-900 font-medium">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

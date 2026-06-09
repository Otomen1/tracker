"use client"

import { useState } from "react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { getDashboardStats, getExpenseBreakdown, getMonthlyTrend, getRecentTransactions } from "@/lib/analytics"
import { getMonthKey } from "@/lib/formatters"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { ExpensePieChart } from "@/components/dashboard/ExpensePieChart"
import { MonthlyBarChart } from "@/components/dashboard/MonthlyBarChart"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey())
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const stats = getDashboardStats(transactions, selectedMonth)
  const expenseBreakdown = getExpenseBreakdown(transactions, selectedMonth, categories)
  const monthlyTrend = getMonthlyTrend(transactions, 6)
  const recentTransactions = getRecentTransactions(transactions, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <StatsCards stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpensePieChart data={expenseBreakdown} />
        <MonthlyBarChart data={monthlyTrend} />
      </div>

      <RecentTransactions
        transactions={recentTransactions}
        categories={categories}
      />
    </div>
  )
}

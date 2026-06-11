"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { getDashboardStats, getExpenseBreakdown, getMonthlyTrend, getRecentTransactions, getBudgetStatus, getSpendingInsights } from "@/lib/analytics"
import { getMonthKey } from "@/lib/formatters"
import { useSettingsContext } from "@/context/SettingsContext"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard"
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard"
import { SpendingInsightsCard } from "@/components/dashboard/SpendingInsightsCard"
import { ChartSkeleton } from "@/components/ui/skeleton"

const ExpensePieChart = dynamic(
  () => import("@/components/dashboard/ExpensePieChart").then((m) => ({ default: m.ExpensePieChart })),
  { loading: () => <ChartSkeleton height={220} />, ssr: false }
)

const MonthlyBarChart = dynamic(
  () => import("@/components/dashboard/MonthlyBarChart").then((m) => ({ default: m.MonthlyBarChart })),
  { loading: () => <ChartSkeleton height={260} />, ssr: false }
)

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey())
  const { transactions } = useTransactions()
  const { categories } = useCategories()
  const { fmt } = useSettingsContext()

  const stats = getDashboardStats(transactions, selectedMonth)
  const expenseBreakdown = getExpenseBreakdown(transactions, selectedMonth, categories)
  const monthlyTrend = getMonthlyTrend(transactions, 6)
  const recentTransactions = getRecentTransactions(transactions, 5)
  const budgetStatus = getBudgetStatus(transactions, selectedMonth, categories)
  const insights = getSpendingInsights(transactions, selectedMonth, categories, fmt)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <StatsCards stats={stats} />

      <SpendingInsightsCard insights={insights} selectedMonth={selectedMonth} />

      <SavingsGoalCard currentNet={stats.currentMonthNet} />

      <BudgetProgressCard budgets={budgetStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpensePieChart data={expenseBreakdown} />
        <MonthlyBarChart data={monthlyTrend} />
      </div>

      <RecentTransactions transactions={recentTransactions} categories={categories} />
    </div>
  )
}

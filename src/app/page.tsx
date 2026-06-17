"use client"

import { useState, useMemo } from "react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { getDashboardStats, getExpenseBreakdown, getMonthlyTrend, getRecentTransactions, getBudgetStatus } from "@/lib/analytics"
import { getMonthKey } from "@/lib/formatters"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { StatsCards } from "@/components/dashboard/StatsCards"
import dynamic from "next/dynamic"
const ExpensePieChart = dynamic(
  () => import("@/components/dashboard/ExpensePieChart").then((m) => ({ default: m.ExpensePieChart })),
  { ssr: false, loading: () => <div className="h-[316px] rounded-xl animate-pulse bg-zinc-100 dark:bg-zinc-800" /> }
)
const MonthlyBarChart = dynamic(
  () => import("@/components/dashboard/MonthlyBarChart").then((m) => ({ default: m.MonthlyBarChart })),
  { ssr: false, loading: () => <div className="h-[316px] rounded-xl animate-pulse bg-zinc-100 dark:bg-zinc-800" /> }
)
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard"
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard"

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey())
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const stats = useMemo(() => getDashboardStats(transactions, selectedMonth), [transactions, selectedMonth])
  const expenseBreakdown = useMemo(() => getExpenseBreakdown(transactions, selectedMonth, categories), [transactions, selectedMonth, categories])
  const monthlyTrend = useMemo(() => getMonthlyTrend(transactions, 6), [transactions])
  const recentTransactions = useMemo(() => getRecentTransactions(transactions, 5), [transactions])
  const budgetStatus = useMemo(() => getBudgetStatus(transactions, selectedMonth, categories), [transactions, selectedMonth, categories])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <StatsCards stats={stats} />

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

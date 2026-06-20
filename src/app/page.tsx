"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useHydrated } from "@/hooks/useHydrated"
import { getDashboardStats, getExpenseBreakdown, getMonthlyTrend, getRecentTransactions, getBudgetStatus, getSpendingInsights } from "@/lib/analytics"
import { getMonthKey } from "@/lib/formatters"
import { MONTHS_IN_CHART, RECENT_TRANSACTIONS_COUNT } from "@/lib/constants"
import { useSettingsContext } from "@/context/SettingsContext"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard"
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard"
import { SpendingInsightsCard } from "@/components/dashboard/SpendingInsightsCard"
import { ChartSkeleton } from "@/components/ui/skeleton"
import { AlertTriangle } from "lucide-react"

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
  const isHydrated = useHydrated()
  const { transactions } = useTransactions()
  const { categories } = useCategories()
  const { fmt } = useSettingsContext()

  const stats = useMemo(() => getDashboardStats(transactions, selectedMonth), [transactions, selectedMonth])
  const expenseBreakdown = useMemo(() => getExpenseBreakdown(transactions, selectedMonth, categories), [transactions, selectedMonth, categories])
  const monthlyTrend = useMemo(() => getMonthlyTrend(transactions, MONTHS_IN_CHART), [transactions])
  const recentTransactions = useMemo(() => getRecentTransactions(transactions, RECENT_TRANSACTIONS_COUNT), [transactions])
  const budgetStatus = useMemo(() => getBudgetStatus(transactions, selectedMonth, categories), [transactions, selectedMonth, categories])
  const insights = useMemo(() => getSpendingInsights(transactions, selectedMonth, categories, fmt), [transactions, selectedMonth, categories, fmt])

  const overBudgetCategories = useMemo(() => budgetStatus.filter((b) => b.isOverBudget), [budgetStatus])

  if (!isHydrated) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-7 w-28 bg-zinc-200 dark:bg-zinc-700 rounded" />
          <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-[316px] bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
          <div className="h-[316px] bg-zinc-200 dark:bg-zinc-700 rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Dashboard</h1>
        <MonthSelector month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {overBudgetCategories.length > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 px-4 py-3 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 rounded-lg text-sm text-rose-700 dark:text-rose-400"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <span className="font-medium">Over budget: </span>
            {overBudgetCategories.map((b) => b.categoryName).join(", ")}
            {overBudgetCategories.length === 1 ? " has " : " have "}
            exceeded the monthly limit.
          </span>
        </div>
      )}

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

"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useHydrated } from "@/hooks/useHydrated"
import { useBudgetCheck } from "@/hooks/useBudgetCheck"
import { useToast } from "@/context/ToastContext"
import { getDashboardStats, getExpenseBreakdown, getMonthlyTrend, getRecentTransactions, getBudgetStatus, getSpendingInsights, getCumulativeBalance } from "@/lib/analytics"
import { getMonthKey, formatMonth } from "@/lib/formatters"
import { MONTHS_IN_CHART, RECENT_TRANSACTIONS_COUNT } from "@/lib/constants"
import { useSettingsContext } from "@/context/SettingsContext"
import { TransactionFormData } from "@/types"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { HeroCard } from "@/components/dashboard/HeroCard"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard"
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard"
import { SpendingInsightsCard } from "@/components/dashboard/SpendingInsightsCard"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { ChartSkeleton, Skeleton } from "@/components/ui/skeleton"

const ExpensePieChart = dynamic(
  () => import("@/components/dashboard/ExpensePieChart").then((m) => ({ default: m.ExpensePieChart })),
  { loading: () => <ChartSkeleton height={220} />, ssr: false }
)

const MonthlyBarChart = dynamic(
  () => import("@/components/dashboard/MonthlyBarChart").then((m) => ({ default: m.MonthlyBarChart })),
  { loading: () => <ChartSkeleton height={260} />, ssr: false }
)

const CumulativeNetChart = dynamic(
  () => import("@/components/dashboard/CumulativeNetChart").then((m) => ({ default: m.CumulativeNetChart })),
  { loading: () => <ChartSkeleton height={200} />, ssr: false }
)

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey())
  const [addOpen, setAddOpen] = useState(false)
  const isHydrated = useHydrated()
  const { transactions, addTransaction } = useTransactions()
  const { categories } = useCategories()
  const { fmt } = useSettingsContext()
  const { checkBudget } = useBudgetCheck()
  const { showToast } = useToast()

  const stats = useMemo(() => getDashboardStats(transactions, selectedMonth), [transactions, selectedMonth])
  const expenseBreakdown = useMemo(() => getExpenseBreakdown(transactions, selectedMonth, categories), [transactions, selectedMonth, categories])
  const monthlyTrend = useMemo(() => getMonthlyTrend(transactions, MONTHS_IN_CHART), [transactions])
  const recentTransactions = useMemo(() => getRecentTransactions(transactions, RECENT_TRANSACTIONS_COUNT), [transactions])
  const budgetStatus = useMemo(() => getBudgetStatus(transactions, selectedMonth, categories), [transactions, selectedMonth, categories])
  const insights = useMemo(() => getSpendingInsights(transactions, selectedMonth, categories, fmt), [transactions, selectedMonth, categories, fmt])
  const cumulativeBalance = useMemo(() => getCumulativeBalance(transactions), [transactions])

  const overBudgetCategories = useMemo(() => budgetStatus.filter((b) => b.isOverBudget), [budgetStatus])

  // The Hero card surfaces the single most important thing to know: an over-budget
  // warning takes priority, otherwise the top spending insight. When the Hero shows
  // the top insight, the list below starts from the next one to avoid repeating it.
  const heroUsesTopInsight = overBudgetCategories.length === 0 && insights.length > 0
  const insightsForList = heroUsesTopInsight ? insights.slice(1) : insights

  const handleAddTransaction = (data: TransactionFormData) => {
    addTransaction(data)
    setAddOpen(false)
    showToast("Transaction added", "success")
    checkBudget(data, transactions)
  }

  if (!isHydrated) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-8 w-32" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-[220px] rounded-xl" />
          <Skeleton className="h-[260px] rounded-xl" />
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

      <HeroCard
        stats={stats}
        monthLabel={formatMonth(selectedMonth)}
        overBudgetCategories={overBudgetCategories}
        topInsight={insights[0]}
        fmt={fmt}
      />

      <QuickActions onAddClick={() => setAddOpen(true)} />

      <StatsCards stats={stats} />

      <SpendingInsightsCard insights={insightsForList} selectedMonth={selectedMonth} />

      <SavingsGoalCard currentNet={stats.currentMonthNet} />

      <BudgetProgressCard budgets={budgetStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpensePieChart data={expenseBreakdown} />
        <MonthlyBarChart data={monthlyTrend} />
      </div>

      <CumulativeNetChart data={cumulativeBalance} />

      <RecentTransactions transactions={recentTransactions} categories={categories} />

      <TransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        onSubmit={handleAddTransaction}
      />
    </div>
  )
}

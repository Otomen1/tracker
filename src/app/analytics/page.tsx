"use client"

import { Suspense, useMemo } from "react"
import dynamic from "next/dynamic"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useAnalyticsPeriod } from "@/hooks/useAnalyticsPeriod"
import { getDashboardStats, getExpenseBreakdown, getIncomeBreakdown, getBudgetStatus, getMonthlyTrend, getCumulativeBalance, getPeriodDateRange } from "@/lib/analytics"
import { PeriodSwitcher } from "@/components/analytics/PeriodSwitcher"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard"
import { ChartSkeleton } from "@/components/ui/skeleton"

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

function AnalyticsPageContent() {
  const { type, month, year, setType, setMonth, setYear } = useAnalyticsPeriod()
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const periodKey = type === "month" ? month : String(year)
  const periodLabel = type === "month" ? "this month" : "this year"
  const trendWindow = type === "month" ? 6 : 12

  const stats = useMemo(() => getDashboardStats(transactions, periodKey), [transactions, periodKey])
  const expenseBreakdown = useMemo(() => getExpenseBreakdown(transactions, periodKey, categories), [transactions, periodKey, categories])
  const incomeBreakdown = useMemo(() => getIncomeBreakdown(transactions, periodKey, categories), [transactions, periodKey, categories])
  const budgetStatus = useMemo(() => getBudgetStatus(transactions, periodKey, categories), [transactions, periodKey, categories])
  const monthlyTrend = useMemo(() => getMonthlyTrend(transactions, trendWindow, periodKey), [transactions, trendWindow, periodKey])
  const cumulativeBalance = useMemo(() => getCumulativeBalance(transactions, periodKey), [transactions, periodKey])
  const periodDateRange = useMemo(() => getPeriodDateRange(periodKey), [periodKey])

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <PeriodSwitcher
          type={type}
          month={month}
          year={year}
          onTypeChange={setType}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Overview</h2>
        <StatsCards stats={stats} comparisonLabel={type === "month" ? "vs last month" : "vs last year"} />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Category Analysis</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExpensePieChart
            data={expenseBreakdown}
            emptyMessage={`No expenses ${periodLabel}`}
          />
          <ExpensePieChart
            data={incomeBreakdown}
            title="Income by Category"
            emptyMessage={`No income ${periodLabel}`}
            ariaLabel="Pie chart showing income breakdown by category"
            tableCaption="Income breakdown by category"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Budget Analysis</h2>
        <BudgetProgressCard budgets={budgetStatus} periodDateRange={periodDateRange} />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Cash Flow</h2>
        <MonthlyBarChart
          data={monthlyTrend}
          title={type === "month" ? "6-Month Overview" : `${year} Monthly Overview`}
          ariaLabel={`Bar chart showing income and expenses ${type === "month" ? "over the last 6 months" : `for ${year}`}`}
          tableCaption={`Income and expenses ${type === "month" ? "over the last 6 months" : `for ${year}`}`}
          enableDeepLinks
        />
        <CumulativeNetChart data={cumulativeBalance} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPageContent />
    </Suspense>
  )
}

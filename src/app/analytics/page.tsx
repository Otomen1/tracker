"use client"

import { Suspense, useMemo } from "react"
import dynamic from "next/dynamic"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useAnalyticsPeriod } from "@/hooks/useAnalyticsPeriod"
import { getDashboardStats, getExpenseBreakdown, getIncomeBreakdown } from "@/lib/analytics"
import { PeriodSwitcher } from "@/components/analytics/PeriodSwitcher"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { ChartSkeleton } from "@/components/ui/skeleton"

const ExpensePieChart = dynamic(
  () => import("@/components/dashboard/ExpensePieChart").then((m) => ({ default: m.ExpensePieChart })),
  { loading: () => <ChartSkeleton height={220} />, ssr: false }
)

function AnalyticsPageContent() {
  const { type, month, year, setType, setMonth, setYear } = useAnalyticsPeriod()
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const periodKey = type === "month" ? month : String(year)
  const periodLabel = type === "month" ? "this month" : "this year"

  const stats = useMemo(() => getDashboardStats(transactions, periodKey), [transactions, periodKey])
  const expenseBreakdown = useMemo(() => getExpenseBreakdown(transactions, periodKey, categories), [transactions, periodKey, categories])
  const incomeBreakdown = useMemo(() => getIncomeBreakdown(transactions, periodKey, categories), [transactions, periodKey, categories])

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

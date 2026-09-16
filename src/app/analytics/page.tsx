"use client"

import { Suspense, useMemo } from "react"
import dynamic from "next/dynamic"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useAnalyticsPeriod } from "@/hooks/useAnalyticsPeriod"
import { useSettingsContext } from "@/context/SettingsContext"
import { getDashboardStats, getExpenseBreakdown, getIncomeBreakdown, getBudgetStatus, getMonthlyTrend, getCumulativeBalance, getPeriodDateRange, getSavingsTrend } from "@/lib/analytics"
import { PeriodSwitcher } from "@/components/analytics/PeriodSwitcher"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard"
import { ChartSkeleton } from "@/components/ui/skeleton"
import { PageHeader } from "@/components/layout/PageHeader"
import { SectionHeader } from "@/components/layout/SectionHeader"
import { EmptyState } from "@/components/ui/empty-state"
import { BarChart3 } from "lucide-react"

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

const SavingsTrendChart = dynamic(
  () => import("@/components/analytics/SavingsTrendChart").then((m) => ({ default: m.SavingsTrendChart })),
  { loading: () => <ChartSkeleton height={240} />, ssr: false }
)

function AnalyticsPageContent() {
  const { type, month, year, setType, setMonth, setYear } = useAnalyticsPeriod()
  const { transactions } = useTransactions()
  const { categories } = useCategories()
  const { settings, fmt } = useSettingsContext()

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
  const savingsTrend = useMemo(
    () => getSavingsTrend(transactions, periodKey, settings.monthlySavingsGoal, trendWindow),
    [transactions, periodKey, settings.monthlySavingsGoal, trendWindow]
  )

  const topExpense = expenseBreakdown[0]
  const topIncome = incomeBreakdown[0]
  const latestMonth = monthlyTrend[monthlyTrend.length - 1]
  const previousMonth = monthlyTrend[monthlyTrend.length - 2]
  const cashFlowSummary = latestMonth && previousMonth
    ? `Net cash flow ${latestMonth.netBalance >= previousMonth.netBalance ? "improved" : "declined"} by ${fmt(Math.abs(latestMonth.netBalance - previousMonth.netBalance))} compared with the previous month.`
    : undefined

  if (transactions.length === 0) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Analytics"
          description="Understand where your money goes and how your balance changes"
          action={<PeriodSwitcher type={type} month={month} year={year} onTypeChange={setType} onMonthChange={setMonth} onYearChange={setYear} />}
        />
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <EmptyState
            icon={BarChart3}
            title="Your analytics will appear here"
            description="Add income and expenses to reveal category breakdowns, cash-flow trends, budget progress, and savings performance."
            action={{ label: "Add transaction", href: "/transactions" }}
            secondaryAction={{ label: "Set budgets", href: "/settings#finance" }}
            className="py-14"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7">
      <PageHeader title="Analytics" description="Understand where your money goes and how your balance changes" action={<PeriodSwitcher
          type={type}
          month={month}
          year={year}
          onTypeChange={setType}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />} />

      <div className="space-y-3">
        <SectionHeader title="Overview" />
        <StatsCards stats={stats} comparisonLabel={type === "month" ? "vs last month" : "vs last year"} />
      </div>

      <div className="space-y-3">
        <SectionHeader title="Category Analysis" description="Compare the categories contributing most to income and spending." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ExpensePieChart
            data={expenseBreakdown}
            emptyMessage={`No expenses ${periodLabel}`}
            summary={topExpense ? `${topExpense.categoryName} is the largest expense category at ${topExpense.percentage.toFixed(0)}% of spending.` : undefined}
          />
          <ExpensePieChart
            data={incomeBreakdown}
            title="Income by Category"
            emptyMessage={`No income ${periodLabel}`}
            ariaLabel="Pie chart showing income breakdown by category"
            tableCaption="Income breakdown by category"
            summary={topIncome ? `${topIncome.categoryName} contributes ${topIncome.percentage.toFixed(0)}% of income for this period.` : undefined}
          />
        </div>
      </div>

      <div className="space-y-3">
        <SectionHeader title="Budget Analysis" />
        <BudgetProgressCard budgets={budgetStatus} periodDateRange={periodDateRange} />
      </div>

      <div className="space-y-3">
        <SectionHeader title="Cash Flow" description="Track month-to-month movement and the running effect on your balance." />
        <MonthlyBarChart
          data={monthlyTrend}
          title={type === "month" ? "6-Month Overview" : `${year} Monthly Overview`}
          ariaLabel={`Bar chart showing income and expenses ${type === "month" ? "over the last 6 months" : `for ${year}`}`}
          tableCaption={`Income and expenses ${type === "month" ? "over the last 6 months" : `for ${year}`}`}
          enableDeepLinks
          summary={cashFlowSummary}
        />
        <CumulativeNetChart data={cumulativeBalance} summary={cumulativeBalance.length ? `Your running balance is ${fmt(cumulativeBalance[cumulativeBalance.length - 1].balance)}.` : undefined} />
      </div>

      <div className="space-y-3">
        <SectionHeader title="Savings" description="Measure progress against your monthly savings goal." />
        <SavingsTrendChart trend={savingsTrend} summary={savingsTrend.achievementRate !== null ? `You have reached ${savingsTrend.achievementRate.toFixed(0)}% of the savings target across this period.` : "Set a monthly savings goal to measure progress against a target."} />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div role="status" className="rounded-xl border border-zinc-200 p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">Loading analytics…</div>}>
      <AnalyticsPageContent />
    </Suspense>
  )
}

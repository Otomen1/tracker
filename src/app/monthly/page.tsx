"use client"

import { Suspense, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { getDashboardStats, getExpenseBreakdown, getBudgetStatus, getTopTransactions } from "@/lib/analytics"
import { getMonthKey } from "@/lib/formatters"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { StatsCards } from "@/components/dashboard/StatsCards"
import dynamic from "next/dynamic"
const ExpensePieChart = dynamic(
  () => import("@/components/dashboard/ExpensePieChart").then((m) => ({ default: m.ExpensePieChart })),
  { ssr: false, loading: () => <div className="h-[316px] rounded-xl animate-pulse bg-zinc-100 dark:bg-zinc-800" /> }
)
import { BudgetProgressCard } from "@/components/dashboard/BudgetProgressCard"
import { TopTransactions } from "@/components/monthly/TopTransactions"

function MonthlyPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const monthParam = searchParams.get("month")
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : getMonthKey()

  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const stats = useMemo(() => getDashboardStats(transactions, month), [transactions, month])
  const expenseBreakdown = useMemo(() => getExpenseBreakdown(transactions, month, categories), [transactions, month, categories])
  const budgetStatus = useMemo(() => getBudgetStatus(transactions, month, categories), [transactions, month, categories])
  const topTransactions = useMemo(() => getTopTransactions(transactions, month, 8), [transactions, month])

  const handleMonthChange = (newMonth: string) => {
    router.push(`/monthly?month=${newMonth}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Monthly Summary</h1>
        <MonthSelector month={month} onChange={handleMonthChange} />
      </div>

      <StatsCards stats={stats} />

      <BudgetProgressCard budgets={budgetStatus} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ExpensePieChart data={expenseBreakdown} />
        <TopTransactions transactions={topTransactions} categories={categories} />
      </div>
    </div>
  )
}

export default function MonthlyPage() {
  return (
    <Suspense fallback={null}>
      <MonthlyPageContent />
    </Suspense>
  )
}

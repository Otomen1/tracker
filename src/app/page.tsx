"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3, Tags, Upload } from "lucide-react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useHydrated } from "@/hooks/useHydrated"
import { useBudgetCheck } from "@/hooks/useBudgetCheck"
import { useToast } from "@/context/ToastContext"
import { getDashboardStats, getRecentTransactions, getBudgetStatus, getSpendingInsights } from "@/lib/analytics"
import { getMonthKey, formatMonth } from "@/lib/formatters"
import { RECENT_TRANSACTIONS_COUNT } from "@/lib/constants"
import { useSettingsContext } from "@/context/SettingsContext"
import { TransactionFormData } from "@/types"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { HeroCard } from "@/components/dashboard/HeroCard"
import { QuickActions } from "@/components/dashboard/QuickActions"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { RecentTransactions } from "@/components/dashboard/RecentTransactions"
import { SavingsGoalCard } from "@/components/dashboard/SavingsGoalCard"
import { SpendingInsightsCard } from "@/components/dashboard/SpendingInsightsCard"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { Skeleton } from "@/components/ui/skeleton"

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
  const recentTransactions = useMemo(() => getRecentTransactions(transactions, RECENT_TRANSACTIONS_COUNT), [transactions])
  const budgetStatus = useMemo(() => getBudgetStatus(transactions, selectedMonth, categories), [transactions, selectedMonth, categories])
  const insights = useMemo(() => getSpendingInsights(transactions, selectedMonth, categories, fmt), [transactions, selectedMonth, categories, fmt])

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

      {transactions.length === 0 && (
        <section
          aria-labelledby="getting-started-title"
          className="rounded-xl border border-zinc-200/70 bg-white/80 p-5 shadow-sm dark:border-zinc-800/70 dark:bg-zinc-900/60"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <BarChart3 className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
            </div>
            <div>
              <h2 id="getting-started-title" className="font-semibold text-zinc-900 dark:text-zinc-100">
                Your financial picture starts here
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Add a transaction or set up your workspace. Everything stays on this device.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <button
              className="flex items-center justify-between rounded-lg bg-zinc-900 px-3 py-2.5 text-left text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              onClick={() => setAddOpen(true)}
            >
              Add first transaction <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              href="/categories"
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Manage categories <Tags className="h-4 w-4" />
            </Link>
            <Link
              href="/settings"
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Import existing data <Upload className="h-4 w-4" />
            </Link>
          </div>
        </section>
      )}

      <StatsCards stats={stats} />

      <SpendingInsightsCard insights={insightsForList} selectedMonth={selectedMonth} />

      <SavingsGoalCard currentNet={stats.currentMonthNet} />

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

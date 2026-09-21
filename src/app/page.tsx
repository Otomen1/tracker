"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ArrowRight, BarChart3 } from "lucide-react"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
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
import { PageHeader } from "@/components/layout/PageHeader"
import { NeedsAttention } from "@/components/dashboard/NeedsAttention"
import { ReviewInboxCard } from "@/components/android/ReviewInboxCard"
import { AccountSummary } from "@/components/accounts/AccountSummary"

export default function DashboardPage() {
  const [selectedMonth, setSelectedMonth] = useState(getMonthKey())
  const [addOpen, setAddOpen] = useState(false)
  const { transactions, addTransaction } = useTransactions()
  const { categories } = useCategories()
  const { fmt, settings } = useSettingsContext()
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

  const handleAddTransaction = async (data: TransactionFormData) => {
    if (!await addTransaction(data)) {
      showToast("Transaction could not be saved. Check browser storage and try again.", "error")
      return false
    }
    setAddOpen(false)
    showToast("Transaction added", "success")
    checkBudget(data, transactions)
    return true
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Your financial overview for ${formatMonth(selectedMonth)}`}
        action={<MonthSelector month={selectedMonth} onChange={setSelectedMonth} />}
      />
      {transactions.length === 0 && <><ReviewInboxCard /><AccountSummary /></>}

      {transactions.length === 0 && (
        <section
          aria-labelledby="getting-started-title"
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 sm:h-11 sm:w-11">
                <BarChart3 className="h-5 w-5 text-zinc-700 dark:text-zinc-300" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{formatMonth(selectedMonth)} · Net</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">{fmt(0)}</p>
                <h2 id="getting-started-title" className="mt-3 font-semibold text-zinc-900 dark:text-zinc-100 sm:mt-4">Your financial picture starts here</h2>
                <p className="mt-1 max-w-lg text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">Add your first transaction to unlock budgets, trends, and spending insights. Your data stays on this device.</p>
              </div>
            </div>
            <div className="flex flex-col items-stretch gap-2 sm:min-w-52">
              <button className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300" onClick={() => setAddOpen(true)}>
                Add first transaction <ArrowRight className="h-4 w-4" />
              </button>
              <div className="flex justify-center gap-4 text-xs">
                <Link href="/categories" className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50">Categories</Link>
                <Link href="/settings#data-backup" className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50">Import data</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {transactions.length > 0 && (
        <>
          <HeroCard stats={stats} monthLabel={formatMonth(selectedMonth)} overBudgetCategories={overBudgetCategories} topInsight={insights[0]} fmt={fmt} />
          <AccountSummary />
          <ReviewInboxCard />
          <div className="flex items-center justify-between gap-3"><QuickActions onAddClick={() => setAddOpen(true)} /></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <NeedsAttention budgets={budgetStatus} insights={insights} currentNet={stats.currentMonthNet} savingsGoal={settings.monthlySavingsGoal} fmt={fmt} />
          </div>
          <RecentTransactions transactions={recentTransactions} categories={categories} />
          <StatsCards stats={stats} />
          <div className="grid gap-4 lg:grid-cols-2">
            <SavingsGoalCard currentNet={stats.currentMonthNet} />
            <SpendingInsightsCard insights={insightsForList} selectedMonth={selectedMonth} />
          </div>
        </>
      )}

      <TransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        onSubmit={handleAddTransaction}
      />
    </div>
  )
}

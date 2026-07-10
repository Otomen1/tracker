"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { QuickAddFAB } from "./QuickAddFAB"
import { StorageQuotaBanner } from "./StorageQuotaBanner"
import { OnboardingModal } from "./OnboardingModal"
import { ErrorBoundary } from "./ErrorBoundary"
import { useScheduledBackup } from "@/hooks/useScheduledBackup"
import { useReminderNotification } from "@/hooks/useReminderNotification"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useBudgetCheck } from "@/hooks/useBudgetCheck"
import { useToast } from "@/context/ToastContext"
import { TransactionFormData } from "@/types"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"

export function AppShell({ children }: { children: React.ReactNode }) {
  useScheduledBackup()
  useReminderNotification()

  // Owned here (not inside QuickAddFAB) so onboarding's finish action and the
  // FAB button can open the exact same TransactionDialog instance instead of
  // each mounting its own.
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { transactions, addTransaction } = useTransactions()
  const { categories } = useCategories()
  const { checkBudget } = useBudgetCheck()
  const { showToast } = useToast()

  const handleQuickAdd = (data: TransactionFormData) => {
    addTransaction(data)
    setQuickAddOpen(false)
    showToast("Transaction added", "success")
    checkBudget(data, transactions)
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[60] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-white focus:text-zinc-900 focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
      >
        Skip to main content
      </a>
      <StorageQuotaBanner />
      <Sidebar />
      <main id="main-content" className="lg:pl-56 pb-16 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <MobileNav />
      <QuickAddFAB onClick={() => setQuickAddOpen(true)} />
      <OnboardingModal onFinish={() => setQuickAddOpen(true)} />
      <TransactionDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        categories={categories}
        onSubmit={handleQuickAdd}
      />
    </div>
  )
}

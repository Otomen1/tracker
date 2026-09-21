"use client"

import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { QuickAddFAB } from "./QuickAddFAB"
import { StorageQuotaBanner } from "./StorageQuotaBanner"
import { StorageRecoveryBanner } from "./StorageRecoveryBanner"
import { ErrorBoundary } from "./ErrorBoundary"
import { useScheduledBackup } from "@/hooks/useScheduledBackup"
import { useReminderNotification } from "@/hooks/useReminderNotification"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { useBudgetCheck } from "@/hooks/useBudgetCheck"
import { useToast } from "@/context/ToastContext"
import { TransactionFormData } from "@/types"
import { TransactionDialog } from "@/components/transactions/TransactionDialog"
import { usePathname } from "next/navigation"
import { AndroidSetup } from "@/components/android/AndroidSetup"
import { AppLock } from "@/components/android/AppLock"
import { useHydrated } from "@/hooks/useHydrated"

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
  const pathname = usePathname()
  const hydrated = useHydrated()
  // Keep the one-handed floating action on the transaction list only. The
  // dashboard already presents an explicit primary add action.
  const showQuickAdd = hydrated && pathname === "/transactions"

  const handleQuickAdd = (data: TransactionFormData) => {
    if (!addTransaction(data)) {
      showToast("Transaction could not be saved. Check browser storage and try again.", "error")
      return false
    }
    setQuickAddOpen(false)
    showToast("Transaction added", "success")
    checkBudget(data, transactions)
    return true
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
      <StorageRecoveryBanner />
      <Sidebar />
      <main id="main-content" className="pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pl-56 lg:pb-0">
        <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-6 lg:py-7">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <MobileNav />
      {showQuickAdd && <QuickAddFAB onClick={() => setQuickAddOpen(true)} />}
      <TransactionDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        categories={categories}
        onSubmit={handleQuickAdd}
      />
      <AndroidSetup />
      <AppLock />
    </div>
  )
}

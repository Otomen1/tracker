"use client"

import { ThemeProvider } from "next-themes"
import { SettingsProvider } from "@/context/SettingsContext"
import { ToastProvider } from "@/context/ToastContext"
import { TransactionsProvider } from "@/context/TransactionsContext"
import { CategoriesProvider } from "@/context/CategoriesContext"
import { AccountsProvider } from "@/context/AccountsContext"
import { ReviewInboxProvider } from "@/context/ReviewInboxContext"
import { SyncProvider } from "@/context/SyncContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SyncProvider>
        <SettingsProvider>
          <ToastProvider>
            <CategoriesProvider>
              <AccountsProvider>
                <TransactionsProvider>
                  <ReviewInboxProvider>{children}</ReviewInboxProvider>
                </TransactionsProvider>
              </AccountsProvider>
            </CategoriesProvider>
          </ToastProvider>
        </SettingsProvider>
      </SyncProvider>
    </ThemeProvider>
  )
}

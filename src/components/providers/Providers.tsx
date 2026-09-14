"use client"

import { ThemeProvider } from "next-themes"
import { SettingsProvider } from "@/context/SettingsContext"
import { ToastProvider } from "@/context/ToastContext"
import { TransactionsProvider } from "@/context/TransactionsContext"
import { CategoriesProvider } from "@/context/CategoriesContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <ToastProvider>
          <CategoriesProvider>
            <TransactionsProvider>
              {children}
            </TransactionsProvider>
          </CategoriesProvider>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}

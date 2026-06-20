"use client"

import { ThemeProvider } from "next-themes"
import { SettingsProvider } from "@/context/SettingsContext"
import { ToastProvider } from "@/context/ToastContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}

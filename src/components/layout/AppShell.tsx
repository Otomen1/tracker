"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { ErrorBoundary } from "./ErrorBoundary"

export function AppShell({ children }: { children: React.ReactNode }) {
  const [quotaWarning, setQuotaWarning] = useState(false)

  useEffect(() => {
    const handler = () => setQuotaWarning(true)
    window.addEventListener("storage-quota-exceeded", handler)
    return () => window.removeEventListener("storage-quota-exceeded", handler)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {quotaWarning && (
        <div
          role="alert"
          className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center justify-between text-sm text-amber-800 dark:text-amber-200"
        >
          <span>
            Storage is full — your last change was not saved. Free up space by exporting and clearing data.
          </span>
          <button
            onClick={() => setQuotaWarning(false)}
            aria-label="Dismiss storage warning"
            className="ml-4 shrink-0 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
          >
            ×
          </button>
        </div>
      )}
      <Sidebar />
      <main className="lg:pl-56 pb-16 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
      <MobileNav />
    </div>
  )
}

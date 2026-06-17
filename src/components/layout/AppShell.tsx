"use client"

import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { QuickAddFAB } from "./QuickAddFAB"
import { StorageQuotaBanner } from "./StorageQuotaBanner"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <StorageQuotaBanner />
      <Sidebar />
      <main className="lg:pl-56 pb-16 lg:pb-0">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>
      <MobileNav />
      <QuickAddFAB />
    </div>
  )
}

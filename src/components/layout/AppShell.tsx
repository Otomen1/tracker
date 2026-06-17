"use client"

import { Sidebar } from "./Sidebar"
import { MobileNav } from "./MobileNav"
import { QuickAddFAB } from "./QuickAddFAB"
import { StorageQuotaBanner } from "./StorageQuotaBanner"
import { OnboardingModal } from "./OnboardingModal"

export function AppShell({ children }: { children: React.ReactNode }) {
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
          {children}
        </div>
      </main>
      <MobileNav />
      <QuickAddFAB />
      <OnboardingModal />
    </div>
  )
}

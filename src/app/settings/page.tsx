"use client"

import { useEffect, useState } from "react"
import { ThemeToggle } from "@/components/settings/ThemeToggle"
import { CurrencySelector } from "@/components/settings/CurrencySelector"
import { SavingsGoalForm } from "@/components/settings/SavingsGoalForm"
import { BudgetLimitsForm } from "@/components/settings/BudgetLimitsForm"
import { BackupRestore } from "@/components/settings/BackupRestore"
import { ReminderSettings } from "@/components/settings/ReminderSettings"
import { InstallPrompt } from "@/components/settings/InstallPrompt"
import { Separator } from "@/components/ui/separator"

function SettingSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
      <div className="sm:w-56 shrink-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        {description && <p className="text-xs text-zinc-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

function StorageUsage() {
  const [usage, setUsage] = useState<{ kb: number; pct: number } | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const bytes = Object.entries(localStorage)
        .filter(([k]) => k.startsWith("tracker_"))
        .reduce((sum, [k, v]) => sum + k.length + v.length, 0) * 2
      const kb = Math.round(bytes / 1024)
      const pct = Math.min((bytes / (5 * 1024 * 1024)) * 100, 100)
      setUsage({ kb, pct })
    } catch {}
  }, [])

  if (!usage) return null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>App data usage</span>
        <span>{usage.kb} KB of ~5 MB ({usage.pct.toFixed(1)}%)</span>
      </div>
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${usage.pct > 80 ? "bg-rose-500" : "bg-emerald-500"}`}
          style={{ width: `${usage.pct}%` }}
        />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>

      <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 p-5 space-y-6">
        <SettingSection title="Appearance" description="Choose your preferred color scheme">
          <ThemeToggle />
        </SettingSection>

        <Separator />

        <SettingSection title="Currency" description="Used for all amounts in the app">
          <CurrencySelector />
        </SettingSection>

        <Separator />

        <SettingSection title="Monthly Savings Goal" description="Target net savings per month">
          <SavingsGoalForm />
        </SettingSection>

        <Separator />

        <SettingSection title="Category Budgets" description="Monthly spending limit per expense category">
          <BudgetLimitsForm />
        </SettingSection>

        <Separator />

        <SettingSection title="Data Backup" description="Export or restore your data">
          <BackupRestore />
        </SettingSection>

        <Separator />

        <SettingSection title="Daily Reminder" description="Get a notification to log your expenses each day">
          <ReminderSettings />
        </SettingSection>

        <Separator />

        <SettingSection title="Storage" description="Local storage used by this app">
          <StorageUsage />
        </SettingSection>

        <Separator />

        <SettingSection title="Install App" description="Add to your home screen for a native-like experience">
          <InstallPrompt />
        </SettingSection>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ThemeToggle } from "@/components/settings/ThemeToggle"
import { CurrencySelector } from "@/components/settings/CurrencySelector"
import { SavingsGoalForm } from "@/components/settings/SavingsGoalForm"
import { BudgetLimitsForm } from "@/components/settings/BudgetLimitsForm"
import { BackupRestore } from "@/components/settings/BackupRestore"
import { ReminderSettings } from "@/components/settings/ReminderSettings"
import { InstallPrompt } from "@/components/settings/InstallPrompt"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { PageHeader } from "@/components/layout/PageHeader"
import { SettingsNav } from "@/components/settings/SettingsNav"
import { AccountSettings } from "@/components/settings/AccountSettings"
import { AndroidCaptureSettings } from "@/components/settings/AndroidCaptureSettings"

function SettingGroup({ id, title, description, children, warning = false }: { id: string; title: string; description?: string; children: React.ReactNode; warning?: boolean }) {
  return (
    <section id={id} className={`scroll-mt-24 space-y-4 rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900 sm:scroll-mt-6 sm:p-5 ${warning ? "border-amber-300 dark:border-amber-900" : "border-zinc-200 dark:border-zinc-800"}`}>
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        {description && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function SettingSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-4">
      <div className="shrink-0 sm:w-52">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</p>
        {description && <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">{description}</p>}
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
    <div className="space-y-4 sm:space-y-5">
      <PageHeader title="Settings" description="Accounts, bank capture, and preferences for this device" />

      <div className="sticky top-0 z-30 -mx-3 border-y border-zinc-200 bg-zinc-50/95 px-3 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95 lg:hidden">
        <SettingsNav />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-5">
        <div className="hidden self-start lg:sticky lg:top-6 lg:block"><SettingsNav /></div>
        <div className="space-y-4">
        <SettingGroup id="accounts-capture" title="Accounts & bank capture" description="Manage account balances and the bank notifications Tracker may review">
          <SettingSection title="Accounts" description="Opening balance plus confirmed activity makes your current balance.">
            <AccountSettings />
          </SettingSection>

          <Separator />

          <SettingSection title="Bank capture" description="Only approved Ryt Bank and MAE notifications are processed on this device.">
            <AndroidCaptureSettings />
          </SettingSection>
        </SettingGroup>

        <SettingGroup id="preferences" title="Preferences" description="Appearance and currency">
          <SettingSection title="Appearance" description="Choose your preferred color scheme">
            <ThemeToggle />
          </SettingSection>

          <Separator />

          <SettingSection title="Currency" description="Used for all amounts in the app">
            <CurrencySelector />
          </SettingSection>
        </SettingGroup>

        <SettingGroup id="finance" title="Budgets & savings" description="Plan spending and savings goals">
          <SettingSection title="Monthly Savings Goal" description="Target net savings per month">
            <SavingsGoalForm />
          </SettingSection>

          <Separator />

          <SettingSection title="Category Budgets" description="Monthly spending limit per expense category">
            <BudgetLimitsForm />
          </SettingSection>

          <Separator />

          <SettingSection title="Categories" description="Add, edit, or remove income and expense categories">
            <Button className="min-h-11" variant="outline" size="sm" asChild>
              <Link href="/categories">Manage Categories →</Link>
            </Button>
          </SettingSection>
        </SettingGroup>

        <SettingGroup id="notifications" title="Reminders" description="Optional reminders to keep your records up to date">
          <SettingSection title="Daily Reminder" description="Get a notification to log your expenses each day">
            <ReminderSettings />
          </SettingSection>
        </SettingGroup>

        <SettingGroup id="data-backup" title="Data & backup" description="Export or restore private financial records" warning>
          <SettingSection title="Data Backup" description="Export or restore your data">
            <BackupRestore />
          </SettingSection>

          <Separator />

          <SettingSection title="Storage" description="Local storage used by this app">
            <StorageUsage />
          </SettingSection>
        </SettingGroup>

        <SettingGroup id="application" title="Application" description="Platform integration">
          <SettingSection title="Install App" description="Add to your home screen for a native-like experience">
            <InstallPrompt />
          </SettingSection>
        </SettingGroup>
        </div>
      </div>
    </div>
  )
}

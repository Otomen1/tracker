"use client"

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
import { LocalSecuritySettings } from "@/components/settings/LocalSecuritySettings"
import { useVault } from "@/context/VaultContext"
import { useHydrated } from "@/hooks/useHydrated"
import { nativeVault } from "@/lib/nativeVault"

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
  const { data } = useVault()
  const hydrated = useHydrated()
  const isNative = hydrated && nativeVault.isNative()

  return (
    <div className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <p className="font-medium text-zinc-900 dark:text-zinc-100">{data.transactions.length.toLocaleString()} transactions</p>
      <p className="mt-1 text-xs text-zinc-500">{data.accounts.length} accounts · {data.categories.length} categories · {isNative ? "encrypted app-private storage" : "this browser only"}</p>
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

        <SettingGroup id="security" title="Local security" description="Protect financial records stored on this device" warning>
          <SettingSection title="Vault & app lock" description="Encryption, device authentication, and emergency erase controls">
            <LocalSecuritySettings />
          </SettingSection>
        </SettingGroup>

        <SettingGroup id="data-backup" title="Data & backup" description="Export or restore private financial records" warning>
          <SettingSection title="Data Backup" description="Export or restore your data">
            <BackupRestore />
          </SettingSection>

          <Separator />

          <SettingSection title="Storage" description="Records currently held on this device">
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

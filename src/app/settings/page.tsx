"use client"

import { ThemeToggle } from "@/components/settings/ThemeToggle"
import { CurrencySelector } from "@/components/settings/CurrencySelector"
import { SavingsGoalForm } from "@/components/settings/SavingsGoalForm"
import { BackupRestore } from "@/components/settings/BackupRestore"
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

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Settings</h1>

      <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-5 space-y-6">
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

        <SettingSection title="Data Backup" description="Export or restore your data">
          <BackupRestore />
        </SettingSection>
      </div>
    </div>
  )
}

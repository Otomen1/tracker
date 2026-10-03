"use client"

import Link from "next/link"
import { AccountSettings } from "./AccountSettings"
import { AndroidCaptureSettings } from "./AndroidCaptureSettings"
import { BudgetLimitsForm } from "./BudgetLimitsForm"
import { SavingsGoalForm } from "./SavingsGoalForm"
import { ThemeToggle } from "./ThemeToggle"
import { CurrencySelector } from "./CurrencySelector"
import { ReminderSettings } from "./ReminderSettings"
import { LocalSecuritySettings } from "./LocalSecuritySettings"
import { BackupRestore } from "./BackupRestore"
import { InstallPrompt } from "./InstallPrompt"
import { PageHeader } from "@/components/layout/PageHeader"
import { useVault } from "@/context/VaultContext"
import { nativeVault } from "@/lib/nativeVault"
import { useHydrated } from "@/hooks/useHydrated"
import release from "../../../release.json"

export const settingsSections = {
  accounts: "Accounts & transaction sources", capture: "Bank capture", finance: "Categories, budgets & goals", preferences: "Appearance & currency", reminders: "Reminders", security: "Security & app lock", backup: "Backup, restore & storage", about: "About Tracker"
} as const

export function SettingsSection({ section }: { section: keyof typeof settingsSections }) {
  const { data } = useVault()
  const hydrated = useHydrated()
  const native = hydrated && nativeVault.isNative()
  return <div className="space-y-4">
    <Link href="/settings" replace={native} className="inline-flex min-h-11 items-center text-sm font-medium">← Settings</Link>
    <PageHeader title={settingsSections[section]} description="Settings for this device" />
    <section className="space-y-5 rounded-2xl border bg-background p-4 sm:p-5">
      {section === "accounts" && <AccountSettings />}
      {section === "capture" && <AndroidCaptureSettings />}
      {section === "finance" && <><Link href="/categories" className="inline-flex min-h-11 items-center font-medium">Manage categories →</Link><BudgetLimitsForm /><div className="space-y-2"><h2 className="text-sm font-semibold">Recorded net goal</h2><p className="text-xs text-muted-foreground">Optional goal for recorded income minus spending. Unrecorded activity is not included.</p><SavingsGoalForm /></div></>}
      {section === "preferences" && <><ThemeToggle /><CurrencySelector /><p className="text-xs text-muted-foreground">Currency is fixed to your accounts once an account exists. Amounts are not converted; cross-currency transfers are not supported.</p></>}
      {section === "reminders" && <ReminderSettings />}
      {section === "security" && <LocalSecuritySettings />}
      {section === "backup" && <><BackupRestore /><p className="text-sm">{data.transactions.length} transactions · {data.accounts.length} accounts · {data.categories.length} categories</p><p className="text-xs text-muted-foreground">{native ? "Encrypted app-private records. The previous snapshot is recovery for one write, not a backup archive." : "This browser only. Browser storage is not encrypted; exported backups are password-encrypted."}</p></>}
      {section === "about" && <><p className="font-semibold">Tracker {release.version}{native && ` · Android build ${release.androidVersionCode}`}</p><p className="text-sm">Local transaction tracking by source. Account balances and total assets are not tracked. No sign-in, server or cloud sync. App schema {data.schemaVersion}.</p><p className="text-xs text-muted-foreground">Keep your signing key to install APK updates over the existing app. Uninstalling or clearing storage deletes local records. Keep an encrypted portable backup.</p>{!native && <InstallPrompt />}</>}
    </section>
  </div>
}

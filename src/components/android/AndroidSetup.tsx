"use client"

import { FormEvent, useRef, useState } from "react"
import { BellRing, ShieldCheck, WalletCards } from "lucide-react"
import { useAccounts } from "@/context/AccountsContext"
import { useSettingsContext } from "@/context/SettingsContext"
import { useToast } from "@/context/ToastContext"
import { nativeCapture } from "@/lib/nativeCapture"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/hooks/useHydrated"

export function AndroidSetup() {
  const { androidSetupComplete, initializeAndroidAccounts } = useAccounts()
  const { updateSettings } = useSettingsContext()
  const { showToast } = useToast()
  const guard = useRef(false)
  const [saving, setSaving] = useState(false)
  const hydrated = useHydrated()

  if (!hydrated || !nativeCapture.isNative() || androidSetupComplete) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (guard.current) return
    guard.current = true
    setSaving(true)
    try {
      if (!await initializeAndroidAccounts()) throw new Error("Could not save accounts")
      if (!await updateSettings({ currency: "MYR" })) throw new Error("Could not save currency")
      await nativeCapture.setSources(true, true)
      await nativeCapture.requestPrivateAlerts()
      await nativeCapture.openNotificationAccess()
      showToast("Accounts created. Enable Tracker notification access to finish setup.", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Setup could not be completed.", "error")
    } finally { guard.current = false; setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-zinc-950/70 p-3 backdrop-blur-sm">
      <div className="mx-auto my-[max(1rem,env(safe-area-inset-top))] max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"><WalletCards /></div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Set up Tracker on Android</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Set up Ryt and MAE as transaction sources. Tracker records activity you confirm; account balances and total assets are not tracked.</p>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <p className="flex gap-2"><BellRing className="mt-0.5 h-4 w-4 shrink-0" />Capture will be enabled only for Ryt Bank and MAE.</p>
            <p className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Transactions wait for your review and stay on this phone.</p>
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={saving}>{saving ? "Saving…" : "Save and enable notification access"}</Button>
        </form>
      </div>
    </div>
  )
}

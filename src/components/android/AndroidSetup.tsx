"use client"

import { FormEvent, useState } from "react"
import { BellRing, ShieldCheck, WalletCards } from "lucide-react"
import { useAccounts } from "@/context/AccountsContext"
import { useSettingsContext } from "@/context/SettingsContext"
import { useToast } from "@/context/ToastContext"
import { nativeCapture } from "@/lib/nativeCapture"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AndroidSetup() {
  const { androidSetupComplete, initializeAndroidAccounts } = useAccounts()
  const { updateSettings } = useSettingsContext()
  const { showToast } = useToast()
  const [ryt, setRyt] = useState("0.00")
  const [maybank, setMaybank] = useState("0.00")
  const [saving, setSaving] = useState(false)

  if (!nativeCapture.isNative() || androidSetupComplete) return null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const rytBalance = Number(ryt)
    const maybankBalance = Number(maybank)
    if (!Number.isFinite(rytBalance) || !Number.isFinite(maybankBalance)) {
      showToast("Enter valid balances for both accounts.", "error")
      return
    }
    setSaving(true)
    try {
      if (!initializeAndroidAccounts({ ryt: rytBalance, maybank: maybankBalance })) throw new Error("Could not save accounts")
      updateSettings({ currency: "MYR" })
      await nativeCapture.setSources(true, true)
      await nativeCapture.requestPrivateAlerts()
      await nativeCapture.openNotificationAccess()
      showToast("Accounts created. Enable Tracker notification access to finish setup.", "success")
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Setup could not be completed.", "error")
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-zinc-950/70 p-3 backdrop-blur-sm">
      <div className="mx-auto my-[max(1rem,env(safe-area-inset-top))] max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"><WalletCards /></div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Set up Tracker on Android</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">Enter today’s account balances. Tracker will use them as the starting point and calculate future balances from confirmed activity.</p>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <div className="space-y-2"><Label htmlFor="ryt-opening">Ryt Bank current balance</Label><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-zinc-500">RM</span><Input id="ryt-opening" className="pl-10" inputMode="decimal" value={ryt} onChange={(e) => setRyt(e.target.value)} /></div></div>
          <div className="space-y-2"><Label htmlFor="maybank-opening">Maybank Debit current balance</Label><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-zinc-500">RM</span><Input id="maybank-opening" className="pl-10" inputMode="decimal" value={maybank} onChange={(e) => setMaybank(e.target.value)} /></div></div>
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

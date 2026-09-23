"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Info, ShieldCheck, Smartphone } from "lucide-react"
import { nativeCapture } from "@/lib/nativeCapture"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/hooks/useHydrated"

type Status = Awaited<ReturnType<typeof nativeCapture.getStatus>>
type SourceId = "ryt" | "mae"

const TRUSTED_SOURCES = [
  { id: "ryt", label: "Ryt Bank", packageName: "my.rytbank.app" },
  { id: "mae", label: "MAE", packageName: "com.maybank2u.life" },
] as const
const GOOGLE_WALLET_PACKAGE = "com.google.android.apps.walletnfcrel"

export function AndroidCaptureSettings() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savingSource, setSavingSource] = useState<SourceId | null>(null)
  const [requestingAlerts, setRequestingAlerts] = useState(false)
  const hydrated = useHydrated()
  const isNative = hydrated && nativeCapture.isNative()

  const refresh = useCallback(async () => {
    try {
      setError(null)
      setStatus(await nativeCapture.getStatus())
    } catch {
      setError("Capture settings could not be checked. Reopen Tracker and try again.")
    }
  }, [])

  useEffect(() => {
    if (!isNative) return
    void refresh()
    const onFocus = () => void refresh()
    const onVisible = () => { if (document.visibilityState === "visible") void refresh() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [isNative, refresh])

  if (!hydrated) return <p className="text-sm text-zinc-600 dark:text-zinc-400">Checking Android capture availability…</p>
  if (!isNative) return <p className="text-sm text-zinc-600 dark:text-zinc-400">Automatic bank-notification capture is available in the private Android app.</p>
  if (!status) return <p aria-live="polite" className="text-sm text-zinc-600 dark:text-zinc-400">Checking Android permissions…</p>

  const anySourceEnabled = status.rytEnabled || status.maeEnabled
  const ready = status.notificationAccess && anySourceEnabled
  const state = !status.notificationAccess
    ? { title: "Notification access needed", detail: "Allow Tracker to read notifications before it can find bank transactions.", tone: "amber" as const, icon: AlertCircle }
    : !anySourceEnabled
      ? { title: "No bank sources enabled", detail: "Choose Ryt Bank or MAE below. Other apps are ignored.", tone: "amber" as const, icon: AlertCircle }
      : !status.alertsEnabled
        ? { title: "Capture is on · review alerts are off", detail: "Bank notifications can still be captured, but Android alerts for new items are disabled.", tone: "neutral" as const, icon: Info }
        : { title: "Capture ready", detail: "Enabled bank notifications are checked locally on this device.", tone: "green" as const, icon: CheckCircle2 }
  const StateIcon = state.icon
  const stateStyle = state.tone === "green"
    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"
    : state.tone === "amber"
      ? "border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20"
      : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60"
  const iconStyle = state.tone === "green" ? "text-emerald-700 dark:text-emerald-400" : state.tone === "amber" ? "text-amber-700 dark:text-amber-400" : "text-zinc-600 dark:text-zinc-300"

  const change = async (source: SourceId, enabled: boolean) => {
    const next = { ...status, [source === "ryt" ? "rytEnabled" : "maeEnabled"]: enabled }
    setSavingSource(source)
    setError(null)
    try {
      await nativeCapture.setSources(next.rytEnabled, next.maeEnabled)
      setStatus(next)
    } catch {
      setError("That source could not be saved. Your previous setting is unchanged.")
    } finally {
      setSavingSource(null)
    }
  }

  const enableAlerts = async () => {
    setRequestingAlerts(true)
    setError(null)
    try {
      await nativeCapture.requestPrivateAlerts()
      await refresh()
    } catch {
      setError("Review alerts could not be enabled. Check Android notification settings for Tracker.")
    } finally {
      setRequestingAlerts(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className={`flex flex-col gap-3 rounded-xl border p-3.5 sm:flex-row sm:items-center sm:justify-between ${stateStyle}`}>
        <div className="flex min-w-0 items-start gap-3">
          <StateIcon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${iconStyle}`} />
          <div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{state.title}</p>
            <p className="mt-0.5 text-xs leading-5 text-zinc-700 dark:text-zinc-300">{state.detail}</p>
          </div>
        </div>
        {!status.notificationAccess ? (
          <Button className="min-h-11 w-full shrink-0 sm:w-auto" size="sm" onClick={() => void nativeCapture.openNotificationAccess()}>Allow access</Button>
        ) : !status.alertsEnabled ? (
          <Button className="min-h-11 w-full shrink-0 sm:w-auto" size="sm" variant="outline" disabled={requestingAlerts} onClick={() => void enableAlerts()}>
            {requestingAlerts ? "Opening…" : "Enable review alerts"}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {TRUSTED_SOURCES.map(({ id, label }) => {
          const source = id as SourceId
          const enabled = source === "ryt" ? status.rytEnabled : status.maeEnabled
          return (
            <label key={id} className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800/60">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:accent-zinc-100 dark:focus-visible:ring-offset-zinc-900"
                checked={enabled}
                disabled={!status.notificationAccess || savingSource !== null}
                onChange={(event) => void change(source, event.target.checked)}
                aria-label={`Capture ${label} notifications`}
              />
            </label>
          )
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-zinc-50 p-3 text-xs leading-5 text-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
        <p>Notification text stays on this device. Detected transactions wait for your review before they affect balances.</p>
      </div>

      <details className="group rounded-lg border border-zinc-200 dark:border-zinc-700">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500 dark:text-zinc-300 [&::-webkit-details-marker]:hidden">
          <Smartphone aria-hidden="true" className="h-4 w-4" /> Source details
        </summary>
        <div className="space-y-2 border-t border-zinc-200 px-3 py-3 text-xs leading-5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
          {TRUSTED_SOURCES.map((source) => <p key={source.id}><span className="font-medium">{source.label}:</span> <code>{source.packageName}</code> · {source.id === "ryt" ? status.rytEnabled ? "enabled" : "disabled" : status.maeEnabled ? "enabled" : "disabled"}</p>)}
          <p><span className="font-medium">Google Wallet:</span> <code>{GOOGLE_WALLET_PACKAGE}</code> · not captured yet</p>
        </div>
      </details>

      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, Smartphone } from "lucide-react"
import { nativeCapture } from "@/lib/nativeCapture"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/hooks/useHydrated"

type Status = Awaited<ReturnType<typeof nativeCapture.getStatus>>

const TRUSTED_SOURCES = [
  { id: "ryt", label: "Ryt Bank", packageName: "my.rytbank.app" },
  { id: "mae", label: "MAE", packageName: "com.maybank2u.life" },
] as const
const GOOGLE_WALLET_PACKAGE = "com.google.android.apps.walletnfcrel"

export function AndroidCaptureSettings() {
  const [status, setStatus] = useState<Status | null>(null)
  const hydrated = useHydrated()
  const isNative = hydrated && nativeCapture.isNative()
  useEffect(() => { if (isNative) void nativeCapture.getStatus().then(setStatus) }, [isNative])
  if (!hydrated) return <p className="text-sm text-zinc-500">Checking Android capture availability…</p>
  if (!isNative) return <p className="text-sm text-zinc-500">Automatic bank-notification capture is available in the private Android app.</p>
  if (!status) return <p className="text-sm text-zinc-500">Checking Android permissions…</p>
  const change = async (source: "ryt" | "mae", enabled: boolean) => {
    const next = { ...status, [source === "ryt" ? "rytEnabled" : "maeEnabled"]: enabled }
    setStatus(next)
    await nativeCapture.setSources(next.rytEnabled, next.maeEnabled)
  }
  const ready = status.notificationAccess && (status.rytEnabled || status.maeEnabled)
  return <div className="space-y-3">
    <div className={`flex items-center justify-between rounded-lg border p-3 ${ready ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20" : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20"}`}><div className="flex gap-3"><ShieldCheck className={`mt-0.5 h-5 w-5 ${ready ? "text-emerald-600" : "text-amber-600"}`} /><div><p className="text-sm font-medium">{ready ? "Capture ready" : "Setup needed"}</p><p className="text-xs text-zinc-500">{status.notificationAccess ? "Choose the bank sources Tracker may review." : "Enable notification access to review bank transactions."}</p></div></div>{!status.notificationAccess && <Button size="sm" onClick={() => void nativeCapture.openNotificationAccess()}>Enable</Button>}</div>
    <div className="grid gap-2 sm:grid-cols-2">{TRUSTED_SOURCES.map(({ id, label, packageName }) => { const enabled = id === "ryt" ? status.rytEnabled : status.maeEnabled; return <label key={id} className="flex min-h-12 items-center justify-between rounded-lg border border-zinc-200 px-3 text-sm dark:border-zinc-800"><span><span className="block">{label}</span><code className="block text-[11px] text-zinc-500">{packageName}</code></span><input type="checkbox" className="h-5 w-5 accent-zinc-900" checked={enabled} onChange={(e) => void change(id, e.target.checked)} /></label> })}</div>
    <div className="rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-700"><div className="flex gap-3"><Smartphone className="mt-0.5 h-5 w-5 text-zinc-500" /><div><p className="text-sm font-medium">Google Wallet mapping</p><p className="mt-0.5 text-xs leading-5 text-zinc-500">{GOOGLE_WALLET_PACKAGE} is recognized but intentionally ignored. Capture stays disabled until a real Wallet payment notification is safely tested.</p></div></div></div>
  </div>
}

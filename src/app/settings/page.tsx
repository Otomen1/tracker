"use client"
import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/layout/PageHeader"
import { settingsSections } from "@/components/settings/SettingsSection"
import { useHydrated } from "@/hooks/useHydrated"
import { nativeVault } from "@/lib/nativeVault"

export default function SettingsPage() {
  const router = useRouter()
  const hydrated = useHydrated()
  const native = hydrated && nativeVault.isNative()
  useEffect(() => {
    const aliases: Record<string, string> = { "#accounts-capture": "accounts", "#preferences": "preferences", "#finance": "finance", "#reminders": "reminders", "#security": "security", "#data-backup": "backup", "#application": "about" }
    const route = aliases[window.location.hash]
    if (route) router.replace(`/settings/${route}`)
  }, [router])
  return <div className="space-y-4"><PageHeader title="Settings" description="Manage this device" /><nav aria-label="Settings sections" className="divide-y rounded-2xl border bg-background">
    {Object.entries(settingsSections).filter(([key]) => key !== "capture" || native).map(([key, label]) => <Link key={key} href={`/settings/${key}`} className="flex min-h-14 items-center justify-between px-4 py-3 text-sm font-medium">{label}<span aria-hidden>→</span></Link>)}
  </nav></div>
}

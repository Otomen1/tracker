"use client"

import { useEffect } from "react"
import { useSettingsContext } from "@/context/SettingsContext"
import { exportAllData } from "@/lib/storage"

const INTERVAL_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
}

export function useScheduledBackup() {
  const { settings, updateSettings } = useSettingsContext()

  useEffect(() => {
    const interval = settings.backupInterval
    if (!interval || interval === "never") return

    const intervalMs = INTERVAL_MS[interval]
    if (!intervalMs) return

    const now = Date.now()
    const lastAt = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0
    if (now - lastAt < intervalMs) return

    const data = exportAllData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)

    updateSettings({ lastBackupAt: new Date().toISOString() })
  // Only re-check when the interval setting changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.backupInterval])
}

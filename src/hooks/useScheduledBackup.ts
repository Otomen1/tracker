"use client"

import { useEffect } from "react"
import { useSettingsContext } from "@/context/SettingsContext"
import { exportAllData, logSecurityEvent } from "@/lib/storage"
import { encryptData } from "@/lib/crypto"

const INTERVAL_MS: Record<string, number> = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
}

export function useScheduledBackup() {
  const { settings, updateSettings } = useSettingsContext()

  useEffect(() => {
    void (async () => {
    const interval = settings.backupInterval
    if (!interval || interval === "never") return

    const intervalMs = INTERVAL_MS[interval]
    if (!intervalMs) return

    const now = Date.now()
    const lastAt = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0
    if (now - lastAt < intervalMs) return

    const password = settings.backupPassword
    if (!password) {
      logSecurityEvent("scheduled_backup_skipped", { reason: "encryption_password_not_configured" })
      return
    }

    const data = await encryptData(exportAllData(), password)
    const payload = JSON.stringify({ encrypted: true, exportedAt: new Date().toISOString(), payload: data })
    const blob = new Blob([payload], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.enc.json`
    a.click()
    URL.revokeObjectURL(url)

    updateSettings({ lastBackupAt: new Date().toISOString() })
  // Only re-check when the interval setting changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
    })()
  }, [settings.backupInterval, settings.backupPassword])
}

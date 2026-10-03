"use client"

import { useEffect, useState, useRef } from "react"
import { useSettingsContext } from "@/context/SettingsContext"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { nativeVault } from "@/lib/nativeVault"
import { nativeCapture } from "@/lib/nativeCapture"
import { trackerNativePlugin } from "@/lib/trackerNativePlugin"
import { useToast } from "@/context/ToastContext"

export function ReminderSettings() {
  const { settings, updateSettings } = useSettingsContext()
  const [native, setNative] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)
  const guard = useRef(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    if (nativeVault.isNative()) { setNative(true); setIsSupported(true); void nativeCapture.getStatus().then(s => setPermission(s.alertsEnabled ? "granted" : "default")).catch(() => setPermission("default")); return }
    const supported = "Notification" in window
    setIsSupported(supported)
    if (supported) setPermission(Notification.permission)
  }, [])

  if (!isSupported) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Notifications are not supported in this browser.</p>
  }

  const persist = async (enabled: boolean, time: string) => {
    if (native) await trackerNativePlugin.setReminder({ enabled, time })
    if (!await updateSettings({ reminderEnabled: enabled, reminderTime: time })) {
      if (native) await trackerNativePlugin.setReminder({ enabled: !!settings.reminderEnabled, time: settings.reminderTime ?? "20:00" })
      throw new Error("Reminder setting could not be saved.")
    }
  }
  const handleToggle = async () => {
    if (guard.current) return
    guard.current = true
    setSaving(true)
    try {
      if (settings.reminderEnabled) {
        await persist(false, settings.reminderTime ?? "20:00")
        return
      }
      if (native && permission !== "granted") { await nativeCapture.requestPrivateAlerts() }
      if (!native && permission !== "granted") {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== "granted") return
      }
      await persist(true, settings.reminderTime ?? "20:00")
    } catch {
      showToast("Notification permission could not be requested.", "error")
    } finally {
      guard.current = false
      setSaving(false)
    }
  }

  const saveTime = async (reminderTime: string) => {
    if (!reminderTime) return
    try { await persist(!!settings.reminderEnabled, reminderTime) } catch { showToast("Reminder time could not be saved.", "error") }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={settings.reminderEnabled}
          onClick={handleToggle}
          disabled={saving}
          aria-label="Daily reminder"
          className={`relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            settings.reminderEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-600"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
              settings.reminderEnabled ? "translate-x-1.5" : "-translate-x-1.5"
            }`}
          />
        </button>
        <span className="text-sm text-zinc-700 dark:text-zinc-300">
          {settings.reminderEnabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      {permission === "denied" && (
        <p className="text-xs text-rose-500">
          Notifications are blocked. Enable them in your browser or system settings, then reload.
        </p>
      )}

      {!settings.reminderEnabled && permission === "default" && (
          <Button className="min-h-11" variant="outline" size="sm" disabled={saving} onClick={handleToggle}>
          Enable notifications
        </Button>
      )}

      {settings.reminderEnabled && (native || permission === "granted") && (
        <div className="space-y-1.5">
          <Label htmlFor="reminder-time">Reminder time</Label>
          <Input
            id="reminder-time"
            type="time"
            className="min-h-11 w-32"
            value={settings.reminderTime ?? "20:00"}
            onChange={(event) => void saveTime(event.target.value)}
          />
          <p className="text-xs text-zinc-400">
            {native ? "Android schedules a daily reminder even while Tracker is closed. Battery restrictions can delay delivery; enable system notifications." : "The app must be open in a browser tab to receive notifications."}
          </p>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useSettingsContext } from "@/context/SettingsContext"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/context/ToastContext"

export function ReminderSettings() {
  const { settings, updateSettings } = useSettingsContext()
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [isSupported, setIsSupported] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    const supported = "Notification" in window
    setIsSupported(supported)
    if (supported) setPermission(Notification.permission)
  }, [])

  if (!isSupported) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Notifications are not supported in this browser.</p>
  }

  const handleToggle = async () => {
    setSaving(true)
    try {
      if (settings.reminderEnabled) {
        if (!await updateSettings({ reminderEnabled: false })) showToast("Reminder setting could not be saved.", "error")
        return
      }
      if (permission !== "granted") {
        const result = await Notification.requestPermission()
        setPermission(result)
        if (result !== "granted") return
      }
      if (!await updateSettings({ reminderEnabled: true, reminderTime: settings.reminderTime ?? "20:00" })) {
        showToast("Reminder setting could not be saved.", "error")
      }
    } catch {
      showToast("Notification permission could not be requested.", "error")
    } finally {
      setSaving(false)
    }
  }

  const saveTime = async (reminderTime: string) => {
    if (!await updateSettings({ reminderTime })) showToast("Reminder time could not be saved.", "error")
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
          <Button className="min-h-11" variant="outline" size="sm" onClick={handleToggle}>
          Enable notifications
        </Button>
      )}

      {settings.reminderEnabled && permission === "granted" && (
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
            The app must be open in a browser tab to receive notifications.
          </p>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useSettingsContext } from "@/context/SettingsContext"

const LAST_REMINDER_KEY = "tracker_last_reminder_date"

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

export function useReminderNotification() {
  const { settings } = useSettingsContext()

  useEffect(() => {
    if (!settings.reminderEnabled || !settings.reminderTime) return
    if (typeof window === "undefined" || !("Notification" in window)) return
    if (Notification.permission !== "granted") return

    const reminderTime = settings.reminderTime

    const check = () => {
      const today = getTodayString()
      if (localStorage.getItem(LAST_REMINDER_KEY) === today) return
      if (getCurrentHHMM() >= reminderTime) {
        localStorage.setItem(LAST_REMINDER_KEY, today)
        new Notification("Expense Tracker", {
          body: "Don't forget to log your expenses today!",
          icon: "/icons/icon-192x192.png",
          tag: "daily-reminder",
        })
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [settings.reminderEnabled, settings.reminderTime])
}

"use client"

import { Settings } from "@/types"
import { useLocalStorage } from "./useLocalStorage"
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "@/lib/constants"

export function useSettings() {
  const [settings, setSettings] = useLocalStorage<Settings>(
    STORAGE_KEYS.SETTINGS,
    DEFAULT_SETTINGS
  )

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...updates }))
  }

  return { settings, updateSettings }
}

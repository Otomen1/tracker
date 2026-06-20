"use client"

import { createContext, useCallback, useContext } from "react"
import { Settings } from "@/types"
import { useSettings } from "@/hooks/useSettings"
import { DEFAULT_SETTINGS } from "@/lib/constants"
import { formatCurrency as _formatCurrency } from "@/lib/formatters"

interface SettingsContextValue {
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
  fmt: (amount: number) => string
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  fmt: (amount) => _formatCurrency(amount, "USD"),
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings } = useSettings()
  const fmt = useCallback((amount: number) => _formatCurrency(amount, settings.currency), [settings.currency])

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, fmt }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  return useContext(SettingsContext)
}

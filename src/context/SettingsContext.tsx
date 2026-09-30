"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import { Settings } from "@/types"
import { useVault } from "@/context/VaultContext"
import { DEFAULT_SETTINGS } from "@/lib/constants"
import { formatCurrency as _formatCurrency } from "@/lib/formatters"

interface SettingsContextValue {
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => Promise<boolean>
  fmt: (amount: number) => string
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => false,
  fmt: (amount) => _formatCurrency(amount, "MYR"),
})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate } = useVault()
  const settings = data.settings
  const updateSettings = useCallback((updates: Partial<Settings>) => mutate((current) => ({
    ...current,
    settings: { ...current.settings, ...updates },
  })), [mutate])
  const fmt = useCallback((amount: number) => _formatCurrency(amount, settings.currency), [settings.currency])
  const value = useMemo(() => ({ settings, updateSettings, fmt }), [settings, updateSettings, fmt])

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettingsContext() {
  return useContext(SettingsContext)
}

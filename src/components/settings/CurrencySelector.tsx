"use client"

import { useSettingsContext } from "@/context/SettingsContext"
import { CURRENCIES } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/context/ToastContext"

export function CurrencySelector() {
  const { settings, updateSettings } = useSettingsContext()
  const { showToast } = useToast()

  const save = async (currency: string) => {
    if (!await updateSettings({ currency })) showToast("Currency could not be saved.", "error")
  }

  return (
    <Select value={settings.currency} onValueChange={(value) => void save(value)}>
      <SelectTrigger className="min-h-11 w-full sm:w-56">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code}>
            <span className="flex items-center gap-2">
              <span className="w-8 text-xs font-mono text-zinc-500">{c.symbol}</span>
              {c.code} — {c.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

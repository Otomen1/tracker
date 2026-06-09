"use client"

import { useSettingsContext } from "@/context/SettingsContext"
import { CURRENCIES } from "@/lib/constants"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function CurrencySelector() {
  const { settings, updateSettings } = useSettingsContext()

  return (
    <Select value={settings.currency} onValueChange={(v) => updateSettings({ currency: v })}>
      <SelectTrigger className="w-56">
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

"use client"

import { useState } from "react"
import { useSettingsContext } from "@/context/SettingsContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function SavingsGoalForm() {
  const { settings, updateSettings, fmt } = useSettingsContext()
  const [value, setValue] = useState(settings.monthlySavingsGoal?.toString() ?? "")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const parsed = parseFloat(value)
    updateSettings({ monthlySavingsGoal: isNaN(parsed) ? 0 : parsed })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        className="w-40"
      />
      <Button size="sm" onClick={handleSave} variant={saved ? "outline" : "default"}>
        {saved ? "Saved!" : "Save"}
      </Button>
      {settings.monthlySavingsGoal > 0 && (
        <span className="text-sm text-zinc-500">Current: {fmt(settings.monthlySavingsGoal)}/mo</span>
      )}
    </div>
  )
}

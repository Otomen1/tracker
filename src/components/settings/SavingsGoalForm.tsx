"use client"

import { useEffect, useState } from "react"
import { useSettingsContext } from "@/context/SettingsContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/context/ToastContext"

export function SavingsGoalForm() {
  const { settings, updateSettings, fmt } = useSettingsContext()
  const [value, setValue] = useState(settings.monthlySavingsGoal?.toString() ?? "")
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()

  useEffect(() => setValue(settings.monthlySavingsGoal?.toString() ?? ""), [settings.monthlySavingsGoal])

  const handleSave = async () => {
    const parsed = parseFloat(value)
    setSaving(true)
    const success = await updateSettings({ monthlySavingsGoal: isNaN(parsed) ? 0 : parsed })
    setSaving(false)
    setSaved(success)
    if (success) setTimeout(() => setSaved(false), 2000)
    else showToast("Savings goal could not be saved.", "error")
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
      <Button size="sm" onClick={() => void handleSave()} disabled={saving} variant={saved ? "outline" : "default"}>
        {saving ? "Saving…" : saved ? "Saved!" : "Save"}
      </Button>
      {settings.monthlySavingsGoal > 0 && (
        <span className="text-sm text-zinc-500">Current: {fmt(settings.monthlySavingsGoal)}/mo</span>
      )}
    </div>
  )
}

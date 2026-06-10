"use client"

import { useState } from "react"
import { useCategories } from "@/hooks/useCategories"
import { useSettingsContext } from "@/context/SettingsContext"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

function CategoryBudgetRow({ id, name, color, budget }: {
  id: string
  name: string
  color: string
  budget?: number
}) {
  const { updateCategory } = useCategories()
  const { fmt } = useSettingsContext()
  const [value, setValue] = useState(budget?.toString() ?? "")
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    const parsed = parseFloat(value)
    updateCategory(id, { budget: !isNaN(parsed) && parsed > 0 ? parsed : undefined })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center gap-2 w-36 shrink-0 text-sm text-zinc-700 dark:text-zinc-300 truncate">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        {name}
      </span>
      <Input
        type="number"
        min="0"
        step="0.01"
        placeholder="No limit"
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false) }}
        className="w-36 h-8 text-sm"
      />
      <Button size="sm" className="h-8" variant={saved ? "outline" : "default"} onClick={handleSave}>
        {saved ? "Saved!" : "Save"}
      </Button>
      {budget && budget > 0 && !saved && (
        <span className="text-xs text-zinc-400">{fmt(budget)}/mo</span>
      )}
    </div>
  )
}

export function BudgetLimitsForm() {
  const { categories } = useCategories()
  const expenseCategories = categories.filter((c) => c.type === "expense" || c.type === "both")

  if (expenseCategories.length === 0) {
    return <p className="text-sm text-zinc-400">Add expense categories first.</p>
  }

  return (
    <div className="space-y-3">
      {expenseCategories.map((c) => (
        <CategoryBudgetRow
          key={c.id}
          id={c.id}
          name={c.name}
          color={c.color}
          budget={c.budget}
        />
      ))}
    </div>
  )
}

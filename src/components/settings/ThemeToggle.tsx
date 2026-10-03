"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSettingsContext } from "@/context/SettingsContext"

const options = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { settings, updateSettings } = useSettingsContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (mounted) setTheme(settings.theme)
  }, [mounted, setTheme, settings.theme])

  const selectTheme = async (value: typeof options[number]["value"]) => {
    setTheme(value)
    if (!await updateSettings({ theme: value })) setTheme(settings.theme)
  }

  return (
    <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => void selectTheme(value)}
          aria-pressed={mounted && theme === value}
          className={cn(
            "min-h-12 flex-1 flex items-center justify-center gap-2 px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-zinc-500",
            mounted && theme === value
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

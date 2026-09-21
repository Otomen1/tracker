"use client"

import { useEffect, useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const SETTINGS_SECTIONS = [
  { id: "preferences", label: "Preferences" },
  { id: "finance", label: "Finance" },
  { id: "notifications", label: "Notifications" },
  { id: "data-backup", label: "Data & Backup" },
  { id: "application", label: "Application" },
] as const

export function SettingsNav() {
  const [active, setActive] = useState(SETTINGS_SECTIONS[0].id)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id as typeof active)
      },
      { rootMargin: "-15% 0px -70%", threshold: [0, 0.25, 0.5] }
    )
    SETTINGS_SECTIONS.forEach(({ id }) => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })
    return () => observer.disconnect()
  }, [])

  const navigate = (id: string) => {
    setActive(id as typeof active)
    document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" })
    history.replaceState(null, "", `#${id}`)
  }

  return (
    <nav aria-label="Settings sections">
      <div className="lg:hidden">
        <Select value={active} onValueChange={navigate}>
          <SelectTrigger aria-label="Settings section" className="h-10 w-full bg-white dark:bg-zinc-900">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETTINGS_SECTIONS.map((section) => <SelectItem key={section.id} value={section.id}>{section.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="hidden lg:block sticky top-6 rounded-lg border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => navigate(section.id)}
            aria-current={active === section.id ? "location" : undefined}
            className={cn(
              "flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm transition-colors",
              active === section.id
                ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

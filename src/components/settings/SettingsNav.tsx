"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export const SETTINGS_SECTIONS = [
  { id: "accounts-capture", label: "Accounts & capture" },
  { id: "preferences", label: "Preferences" },
  { id: "finance", label: "Budgets & goals" },
  { id: "notifications", label: "Reminders" },
  { id: "data-backup", label: "Data & backup" },
  { id: "application", label: "App" },
] as const

export function SettingsNav() {
  const [active, setActive] = useState<(typeof SETTINGS_SECTIONS)[number]["id"]>(SETTINGS_SECTIONS[0].id)
  const mobileNavRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id as typeof active)
      },
      { rootMargin: "-14% 0px -68%", threshold: [0, 0.2, 0.45] }
    )
    SETTINGS_SECTIONS.forEach(({ id }) => {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = mobileNavRef.current
    const selected = container?.querySelector<HTMLElement>(`[data-section-id="${active}"]`)
    if (!container || !selected) return
    const selectedCenter = selected.offsetLeft + selected.offsetWidth / 2
    container.scrollTo({ left: selectedCenter - container.clientWidth / 2, behavior: "smooth" })
  }, [active])

  const navigate = (id: (typeof SETTINGS_SECTIONS)[number]["id"]) => {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
    history.replaceState(null, "", `#${id}`)
  }

  return (
    <nav aria-label="Settings sections">
      <div
        ref={mobileNavRef}
        className="flex gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
      >
        {SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            data-section-id={section.id}
            onClick={() => navigate(section.id)}
            aria-current={active === section.id ? "location" : undefined}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950",
              active === section.id
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-600"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="sticky top-6 hidden rounded-xl border border-zinc-200 bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:block">
        {SETTINGS_SECTIONS.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => navigate(section.id)}
            aria-current={active === section.id ? "location" : undefined}
            className={cn(
              "flex min-h-11 w-full items-center rounded-lg px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500",
              active === section.id
                ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
    </nav>
  )
}

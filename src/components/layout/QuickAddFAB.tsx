"use client"

import { Plus } from "lucide-react"

interface Props {
  onClick: () => void
}

export function QuickAddFAB({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Add transaction"
      className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-30 w-14 h-14 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
    >
      <Plus className="w-6 h-6" />
    </button>
  )
}

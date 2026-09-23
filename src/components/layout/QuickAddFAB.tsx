"use client"

import { Plus } from "lucide-react"

interface Props {
  onClick: () => void
}

export function QuickAddFAB({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label="Add Transaction"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg shadow-zinc-900/20 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:ring-offset-zinc-950 lg:hidden"
    >
      <Plus className="h-5 w-5" />
    </button>
  )
}

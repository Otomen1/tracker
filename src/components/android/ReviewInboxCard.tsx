"use client"

import Link from "next/link"
import { BellRing, ChevronRight } from "lucide-react"
import { useReviewInbox } from "@/context/ReviewInboxContext"
import { nativeCapture } from "@/lib/nativeCapture"
import { useHydrated } from "@/hooks/useHydrated"

export function ReviewInboxCard() {
  const { items } = useReviewInbox()
  const hydrated = useHydrated()
  if (!hydrated || !nativeCapture.isNative()) return null
  const pending = items.length > 0
  return <Link href="/inbox" className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${pending ? "min-h-16 border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100" : "min-h-12 border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"}`}><span className={`relative flex h-9 w-9 items-center justify-center rounded-lg ${pending ? "bg-amber-100 dark:bg-amber-900" : "bg-zinc-100 dark:bg-zinc-800"}`}><BellRing className="h-4 w-4" />{pending && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-amber-700 px-1 text-center text-[11px] font-bold text-white">{items.length}</span>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Review inbox</span><span className="block text-xs opacity-75">{pending ? `${items.length} detected transaction${items.length === 1 ? "" : "s"} waiting` : "No transactions waiting"}</span></span><ChevronRight className="h-5 w-5" /></Link>
}

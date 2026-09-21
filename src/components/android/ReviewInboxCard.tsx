"use client"

import Link from "next/link"
import { BellRing, ChevronRight } from "lucide-react"
import { useReviewInbox } from "@/context/ReviewInboxContext"
import { nativeCapture } from "@/lib/nativeCapture"

export function ReviewInboxCard() {
  const { items } = useReviewInbox()
  if (!nativeCapture.isNative()) return null
  return <Link href="/inbox" className="flex min-h-16 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-950 transition-colors hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900"><BellRing className="h-5 w-5" />{items.length > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-amber-700 px-1 text-center text-[11px] font-bold text-white">{items.length}</span>}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Review inbox</span><span className="block text-xs opacity-75">{items.length ? `${items.length} detected transaction${items.length === 1 ? "" : "s"} waiting` : "No transactions waiting"}</span></span><ChevronRight className="h-5 w-5" /></Link>
}

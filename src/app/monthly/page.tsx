"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getMonthlyRedirectTarget } from "@/lib/legacyRedirects"

function MonthlyRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => { router.replace(getMonthlyRedirectTarget(searchParams.get("month") ?? undefined)) }, [router, searchParams])
  return <p className="p-6 text-sm text-zinc-500">Opening monthly analytics…</p>
}

export default function MonthlyRedirectPage() {
  return <Suspense fallback={<p className="p-6 text-sm text-zinc-500">Opening monthly analytics…</p>}><MonthlyRedirect /></Suspense>
}

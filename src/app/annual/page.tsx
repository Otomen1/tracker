"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getAnnualRedirectTarget } from "@/lib/legacyRedirects"

function AnnualRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  useEffect(() => { router.replace(getAnnualRedirectTarget(searchParams.get("year") ?? undefined)) }, [router, searchParams])
  return <p className="p-6 text-sm text-zinc-500">Opening annual analytics…</p>
}

export default function AnnualRedirectPage() {
  return <Suspense fallback={<p className="p-6 text-sm text-zinc-500">Opening annual analytics…</p>}><AnnualRedirect /></Suspense>
}

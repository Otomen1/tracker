"use client"

import { useCallback, useMemo } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { getMonthKey, getYearKey } from "@/lib/formatters"

export type PeriodType = "month" | "year"

export interface AnalyticsPeriodValue {
  type: PeriodType
  month: string
  year: number
}

export function parseAnalyticsPeriod(params: URLSearchParams, currentYear: number = getYearKey()): AnalyticsPeriodValue {
  const type: PeriodType = params.get("view") === "year" ? "year" : "month"

  const monthParam = params.get("month")
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : getMonthKey()

  const yearParam = params.get("year")
  const parsedYear = yearParam ? parseInt(yearParam, 10) : NaN
  const year = Number.isInteger(parsedYear) && parsedYear > 0 ? Math.min(parsedYear, currentYear) : currentYear

  return { type, month, year }
}

export function serializeAnalyticsPeriod(period: AnalyticsPeriodValue, existingParams: URLSearchParams): string {
  const params = new URLSearchParams(existingParams.toString())
  params.set("view", period.type)
  if (period.type === "month") {
    params.set("month", period.month)
    params.delete("year")
  } else {
    params.set("year", String(period.year))
    params.delete("month")
  }
  return params.toString()
}

export function useAnalyticsPeriod() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentYear = getYearKey()

  const period = useMemo(
    () => parseAnalyticsPeriod(searchParams, currentYear),
    [searchParams, currentYear]
  )

  const navigate = useCallback((next: Partial<AnalyticsPeriodValue>) => {
    const merged: AnalyticsPeriodValue = { ...period, ...next }
    if (merged.type === "year") merged.year = Math.min(merged.year, currentYear)
    router.push(`${pathname}?${serializeAnalyticsPeriod(merged, searchParams)}`)
  }, [period, searchParams, router, pathname, currentYear])

  return {
    ...period,
    setType: useCallback((type: PeriodType) => navigate({ type }), [navigate]),
    setMonth: useCallback((month: string) => navigate({ month }), [navigate]),
    setYear: useCallback((year: number) => navigate({ year }), [navigate]),
  }
}

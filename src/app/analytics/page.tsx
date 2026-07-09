"use client"

import { Suspense } from "react"
import { useAnalyticsPeriod } from "@/hooks/useAnalyticsPeriod"
import { PeriodSwitcher } from "@/components/analytics/PeriodSwitcher"

function AnalyticsPageContent() {
  const { type, month, year, setType, setMonth, setYear } = useAnalyticsPeriod()

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Analytics</h1>
        <PeriodSwitcher
          type={type}
          month={month}
          year={year}
          onTypeChange={setType}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={null}>
      <AnalyticsPageContent />
    </Suspense>
  )
}

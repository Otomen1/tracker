"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { getAnnualSummary } from "@/lib/analytics"
import { getYearKey } from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ChartSkeleton } from "@/components/ui/skeleton"

const AnnualSummaryView = dynamic(
  () => import("@/components/annual/AnnualSummary").then((m) => ({ default: m.AnnualSummaryView })),
  { loading: () => <ChartSkeleton height={260} />, ssr: false }
)

export default function AnnualPage() {
  const currentYear = getYearKey()
  const [year, setYear] = useState(currentYear)
  const { transactions } = useTransactions()
  const { categories } = useCategories()

  const summary = useMemo(() => getAnnualSummary(transactions, year, categories), [transactions, year, categories])
  const prevYearSummary = useMemo(
    () => (year < currentYear ? getAnnualSummary(transactions, year - 1, categories) : null),
    [transactions, year, categories, currentYear]
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Annual Summary</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium w-12 text-center">{year}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setYear((y) => y + 1)} disabled={year >= currentYear}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AnnualSummaryView summary={summary} prevYearSummary={prevYearSummary} />
    </div>
  )
}

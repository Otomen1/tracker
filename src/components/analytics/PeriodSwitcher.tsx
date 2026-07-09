"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MonthSelector } from "@/components/dashboard/MonthSelector"
import { getYearKey } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { PeriodType } from "@/hooks/useAnalyticsPeriod"

interface Props {
  type: PeriodType
  month: string
  year: number
  onTypeChange: (type: PeriodType) => void
  onMonthChange: (month: string) => void
  onYearChange: (year: number) => void
}

export function PeriodSwitcher({ type, month, year, onTypeChange, onMonthChange, onYearChange }: Props) {
  const currentYear = getYearKey()

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md border border-input overflow-hidden">
        {(["month", "year"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={type === t}
            onClick={() => onTypeChange(t)}
            className={cn(
              "px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              type === t
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {type === "month" ? (
        <MonthSelector month={month} onChange={onMonthChange} />
      ) : (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous year"
            onClick={() => onYearChange(year - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span aria-live="polite" aria-atomic="true" className="text-sm font-medium w-12 text-center">
            {year}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Next year"
            onClick={() => onYearChange(year + 1)}
            disabled={year >= currentYear}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatMonth, addMonths, getMonthKey } from "@/lib/formatters"

interface Props {
  month: string
  onChange: (month: string) => void
}

export function MonthSelector({ month, onChange }: Props) {
  const isCurrentMonth = month === getMonthKey()

  return (
    <div className="flex max-w-full items-center gap-1 sm:gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:h-8 sm:w-8"
        aria-label="Previous month"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span aria-live="polite" aria-atomic="true" className="w-32 text-center text-sm font-medium">
        {formatMonth(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 sm:h-8 sm:w-8"
        aria-label="Next month"
        onClick={() => onChange(addMonths(month, 1))}
        disabled={isCurrentMonth}
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-zinc-500"
          onClick={() => onChange(getMonthKey())}
        >
          Today
        </Button>
      )}
    </div>
  )
}

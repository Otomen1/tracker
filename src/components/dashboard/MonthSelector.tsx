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
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <span className="text-sm font-medium w-32 text-center">
        {formatMonth(month)}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
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

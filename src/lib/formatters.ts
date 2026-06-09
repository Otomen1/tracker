import { format, parseISO } from "date-fns"

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "MMM d, yyyy")
  } catch {
    return isoDate
  }
}

export function formatMonth(monthKey: string): string {
  try {
    return format(parseISO(`${monthKey}-01`), "MMMM yyyy")
  } catch {
    return monthKey
  }
}

export function formatShortMonth(monthKey: string): string {
  try {
    return format(parseISO(`${monthKey}-01`), "MMM yy")
  } catch {
    return monthKey
  }
}

export function getMonthKey(date?: Date): string {
  const d = date ?? new Date()
  return format(d, "yyyy-MM")
}

export function addMonths(monthKey: string, delta: number): string {
  const date = parseISO(`${monthKey}-01`)
  date.setMonth(date.getMonth() + delta)
  return format(date, "yyyy-MM")
}

export function getTodayString(): string {
  return format(new Date(), "yyyy-MM-dd")
}

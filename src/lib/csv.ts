import { Transaction, Category } from "@/types"
import { formatDate } from "./formatters"

// Prevent CSV formula injection (Excel/Sheets execute cells starting with these chars)
const sanitizeCsvField = (v: string) =>
  /^[=+\-@\t\r]/.test(v) ? `\t${v}` : v

export function transactionsToCSV(
  transactions: Transaction[],
  categories: Category[]
): string {
  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Unknown"

  const headers = ["Date", "Type", "Category", "Description", "Amount"]
  const rows = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => [
      formatDate(t.date),
      t.type === "income" ? "Income" : "Expense",
      sanitizeCsvField(getCategoryName(t.categoryId)),
      `"${sanitizeCsvField(t.description).replace(/"/g, '""')}"`,
      t.type === "income"
        ? t.amount.toFixed(2)
        : `-${t.amount.toFixed(2)}`,
    ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

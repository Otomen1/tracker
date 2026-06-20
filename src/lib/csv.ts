import { Transaction, Category } from "@/types"
import { formatDate } from "./formatters"

function escapeCsvCell(value: string): string {
  // Prefix formula-injection characters so spreadsheets don't execute them
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

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
      escapeCsvCell(formatDate(t.date)),
      escapeCsvCell(t.type === "income" ? "Income" : "Expense"),
      escapeCsvCell(getCategoryName(t.categoryId)),
      escapeCsvCell(t.description),
      t.type === "income" ? t.amount.toFixed(2) : `-${t.amount.toFixed(2)}`,
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

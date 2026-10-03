import { saveOrShareFile } from "./fileExport"
import { Transaction, Category, Account } from "@/types"
import { formatDate } from "./formatters"

function escapeCsvCell(value: string): string {
  // Prefix formula-injection characters so spreadsheets don't execute them
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replace(/"/g, '""')}"`
}

export function transactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts?: Account[]
): string {
  const getCategoryName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Unknown"

  const headers = ["Date", "Type", "Category", "Description", "Amount"]
  if (accounts) headers.push("Source", "From", "To")
  const sourceName = (id?: string) => accounts?.find(account => account.id === id)?.name ?? id ?? ""
  const rows = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((t) => [
      escapeCsvCell(formatDate(t.date)),
      escapeCsvCell(t.type === "income" ? "Income" : t.type === "expense" ? "Expense" : "Transfer"),
      escapeCsvCell(t.type === "transfer" ? "Internal transfer" : getCategoryName(t.categoryId)),
      escapeCsvCell(t.description),
      t.type === "income" ? t.amount.toFixed(2) : t.type === "expense" ? `-${t.amount.toFixed(2)}` : t.amount.toFixed(2),
      ...(accounts ? [escapeCsvCell(sourceName(t.accountId)), escapeCsvCell(sourceName(t.fromAccountId)), escapeCsvCell(sourceName(t.toAccountId))] : []),
    ])

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
}

export async function downloadCSV(content: string, filename: string): Promise<void> {
  await saveOrShareFile(content, filename, "text/csv;charset=utf-8;")
}

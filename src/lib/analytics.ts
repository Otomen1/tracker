import { Transaction, Category, DashboardStats, CategoryBreakdown, MonthlySummary, TransactionFilters } from "@/types"
import { getMonthKey, addMonths } from "./formatters"

export function getDashboardStats(
  transactions: Transaction[],
  monthKey: string
): DashboardStats {
  const prevMonthKey = addMonths(monthKey, -1)

  const currentMonth = transactions.filter((t) => t.date.startsWith(monthKey))
  const prevMonth = transactions.filter((t) => t.date.startsWith(prevMonthKey))

  const currentMonthIncome = currentMonth
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const currentMonthExpenses = currentMonth
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  const previousMonthIncome = prevMonth
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const previousMonthExpenses = prevMonth
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  const allTimeIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)

  const allTimeExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    currentMonthIncome,
    currentMonthExpenses,
    currentMonthNet: currentMonthIncome - currentMonthExpenses,
    allTimeBalance: allTimeIncome - allTimeExpenses,
    previousMonthIncome,
    previousMonthExpenses,
    transactionCountThisMonth: currentMonth.length,
  }
}

export function getExpenseBreakdown(
  transactions: Transaction[],
  monthKey: string,
  categories: Category[]
): CategoryBreakdown[] {
  const expenses = transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(monthKey)
  )

  const total = expenses.reduce((sum, t) => sum + t.amount, 0)
  if (total === 0) return []

  const grouped = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.categoryId] = (acc[t.categoryId] ?? 0) + t.amount
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([categoryId, amount]) => {
      const cat = categories.find((c) => c.id === categoryId)
      return {
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        color: cat?.color ?? "#6b7280",
        total: amount,
        percentage: (amount / total) * 100,
        count: expenses.filter((t) => t.categoryId === categoryId).length,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export function getMonthlyTrend(
  transactions: Transaction[],
  monthCount: number = 6
): MonthlySummary[] {
  const currentMonthKey = getMonthKey()
  const months: MonthlySummary[] = []

  for (let i = monthCount - 1; i >= 0; i--) {
    const monthKey = addMonths(currentMonthKey, -i)
    const monthTxns = transactions.filter((t) => t.date.startsWith(monthKey))

    const totalIncome = monthTxns
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = monthTxns
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    months.push({
      month: monthKey,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: monthTxns.length,
    })
  }

  return months
}

export function filterTransactions(
  transactions: Transaction[],
  filters: TransactionFilters
): Transaction[] {
  return transactions.filter((t) => {
    if (filters.type && t.type !== filters.type) return false
    if (filters.categoryId && t.categoryId !== filters.categoryId) return false
    if (filters.dateFrom && t.date < filters.dateFrom) return false
    if (filters.dateTo && t.date > filters.dateTo) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      if (!t.description.toLowerCase().includes(q)) return false
    }
    return true
  })
}

export function getRecentTransactions(
  transactions: Transaction[],
  count: number = 5
): Transaction[] {
  return [...transactions]
    .sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date)
      if (dateDiff !== 0) return dateDiff
      return b.createdAt.localeCompare(a.createdAt)
    })
    .slice(0, count)
}

export function getSortedTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date)
    if (dateDiff !== 0) return dateDiff
    return b.createdAt.localeCompare(a.createdAt)
  })
}

import {
  Transaction, Category, DashboardStats, CategoryBreakdown,
  MonthlySummary, TransactionFilters, BudgetStatus, AnnualSummary
} from "@/types"
import { getMonthKey, addMonths } from "./formatters"

export function getDashboardStats(
  transactions: Transaction[],
  monthKey: string
): DashboardStats {
  const prevMonthKey = addMonths(monthKey, -1)
  const currentMonth = transactions.filter((t) => t.date.startsWith(monthKey))
  const prevMonth = transactions.filter((t) => t.date.startsWith(prevMonthKey))

  const currentMonthIncome = currentMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const currentMonthExpenses = currentMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const previousMonthIncome = prevMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const previousMonthExpenses = prevMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const allTimeIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const allTimeExpenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)

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
  const total = expenses.reduce((s, t) => s + t.amount, 0)
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

export function getBudgetStatus(
  transactions: Transaction[],
  monthKey: string,
  categories: Category[]
): BudgetStatus[] {
  const budgetedCategories = categories.filter(
    (c) => c.type === "expense" && c.budget && c.budget > 0
  )
  if (budgetedCategories.length === 0) return []

  const expenses = transactions.filter(
    (t) => t.type === "expense" && t.date.startsWith(monthKey)
  )

  return budgetedCategories.map((cat) => {
    const spent = expenses
      .filter((t) => t.categoryId === cat.id)
      .reduce((s, t) => s + t.amount, 0)
    const budget = cat.budget!
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      color: cat.color,
      budget,
      spent,
      percentage: (spent / budget) * 100,
      isOverBudget: spent > budget,
    }
  }).sort((a, b) => b.percentage - a.percentage)
}

export function getMonthlyTrend(
  transactions: Transaction[],
  monthCount = 6
): MonthlySummary[] {
  const currentMonthKey = getMonthKey()
  return Array.from({ length: monthCount }, (_, i) => {
    const monthKey = addMonths(currentMonthKey, -(monthCount - 1 - i))
    const monthTxns = transactions.filter((t) => t.date.startsWith(monthKey))
    const totalIncome = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const totalExpenses = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    return {
      month: monthKey,
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
      transactionCount: monthTxns.length,
    }
  })
}

export function getAnnualSummary(
  transactions: Transaction[],
  year: number,
  categories: Category[]
): AnnualSummary {
  const yearStr = year.toString()
  const yearTxns = transactions.filter((t) => t.date.startsWith(yearStr))
  const totalIncome = yearTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpenses = yearTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0")
    const monthKey = `${yearStr}-${month}`
    const monthTxns = yearTxns.filter((t) => t.date.startsWith(monthKey))
    const inc = monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0)
    const exp = monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0)
    return { month: monthKey, totalIncome: inc, totalExpenses: exp, netBalance: inc - exp, transactionCount: monthTxns.length }
  })

  const yearExpenses = yearTxns.filter((t) => t.type === "expense")
  const yearExpTotal = yearExpenses.reduce((s, t) => s + t.amount, 0)
  const grouped = yearExpenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.categoryId] = (acc[t.categoryId] ?? 0) + t.amount
    return acc
  }, {})
  const topExpenseCategories: CategoryBreakdown[] = Object.entries(grouped)
    .map(([categoryId, amount]) => {
      const cat = categories.find((c) => c.id === categoryId)
      return {
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        color: cat?.color ?? "#6b7280",
        total: amount,
        percentage: yearExpTotal > 0 ? (amount / yearExpTotal) * 100 : 0,
        count: yearExpenses.filter((t) => t.categoryId === categoryId).length,
      }
    })
    .sort((a, b) => b.total - a.total)

  return { year, totalIncome, totalExpenses, netBalance: totalIncome - totalExpenses, monthlyBreakdown, topExpenseCategories }
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
    if (filters.tag && !(t.tags ?? []).includes(filters.tag)) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const matchDesc = t.description.toLowerCase().includes(q)
      const matchNotes = (t.notes ?? "").toLowerCase().includes(q)
      const matchTags = (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
      if (!matchDesc && !matchNotes && !matchTags) return false
    }
    return true
  })
}

export function getRecentTransactions(transactions: Transaction[], count = 5): Transaction[] {
  return getSortedTransactions(transactions).slice(0, count)
}

export function getTopTransactions(transactions: Transaction[], monthKey: string, count = 5): Transaction[] {
  return transactions
    .filter((t) => t.date.startsWith(monthKey))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, count)
}

export function getSortedTransactions(transactions: Transaction[]): Transaction[] {
  return [...transactions].sort((a, b) => {
    const d = b.date.localeCompare(a.date)
    return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt)
  })
}

import {
  Transaction, Category, DashboardStats, CategoryBreakdown,
  MonthlySummary, TransactionFilters, BudgetStatus, AnnualSummary, Insight
} from "@/types"
import { getMonthKey, addMonths } from "./formatters"

const round2 = (n: number) => Math.round(n * 100) / 100

export function getDashboardStats(
  transactions: Transaction[],
  monthKey: string
): DashboardStats {
  const prevMonthKey = addMonths(monthKey, -1)
  const currentMonth = transactions.filter((t) => t.date.startsWith(monthKey))
  const prevMonth = transactions.filter((t) => t.date.startsWith(prevMonthKey))

  const currentMonthIncome = round2(currentMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0))
  const currentMonthExpenses = round2(currentMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))
  const previousMonthIncome = round2(prevMonth.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0))
  const previousMonthExpenses = round2(prevMonth.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))
  const allTimeIncome = round2(transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0))
  const allTimeExpenses = round2(transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))

  return {
    currentMonthIncome,
    currentMonthExpenses,
    currentMonthNet: round2(currentMonthIncome - currentMonthExpenses),
    allTimeBalance: round2(allTimeIncome - allTimeExpenses),
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

  const grouped = expenses.reduce<Record<string, { sum: number; count: number }>>((acc, t) => {
    const entry = acc[t.categoryId] ?? { sum: 0, count: 0 }
    entry.sum += t.amount
    entry.count += 1
    acc[t.categoryId] = entry
    return acc
  }, {})

  return Object.entries(grouped)
    .map(([categoryId, { sum, count }]) => {
      const cat = categories.find((c) => c.id === categoryId)
      return {
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        color: cat?.color ?? "#6b7280",
        total: round2(sum),
        percentage: round2((sum / total) * 100),
        count,
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

  const spentByCategory = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.categoryId] = (acc[t.categoryId] ?? 0) + t.amount
    return acc
  }, {})

  return budgetedCategories.map((cat) => {
    const spent = round2(spentByCategory[cat.id] ?? 0)
    const budget = cat.budget!
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      color: cat.color,
      budget,
      spent,
      percentage: round2((spent / budget) * 100),
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
    const totalIncome = round2(monthTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0))
    const totalExpenses = round2(monthTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0))
    return {
      month: monthKey,
      totalIncome,
      totalExpenses,
      netBalance: round2(totalIncome - totalExpenses),
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

  // Single-pass accumulator over all transactions
  type MonthBucket = { inc: number; exp: number; count: number }
  const monthly: Record<string, MonthBucket> = {}
  const catMap: Record<string, { sum: number; count: number }> = {}
  let totalIncome = 0
  let totalExpenses = 0

  for (const t of transactions) {
    if (!t.date.startsWith(yearStr)) continue
    const monthKey = t.date.slice(0, 7)
    const bucket = monthly[monthKey] ?? (monthly[monthKey] = { inc: 0, exp: 0, count: 0 })
    bucket.count += 1
    if (t.type === "income") {
      totalIncome += t.amount
      bucket.inc += t.amount
    } else {
      totalExpenses += t.amount
      bucket.exp += t.amount
      const entry = catMap[t.categoryId] ?? (catMap[t.categoryId] = { sum: 0, count: 0 })
      entry.sum += t.amount
      entry.count += 1
    }
  }

  const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => {
    const monthKey = `${yearStr}-${String(i + 1).padStart(2, "0")}`
    const b = monthly[monthKey] ?? { inc: 0, exp: 0, count: 0 }
    const inc = round2(b.inc)
    const exp = round2(b.exp)
    return { month: monthKey, totalIncome: inc, totalExpenses: exp, netBalance: round2(inc - exp), transactionCount: b.count }
  })

  const topExpenseCategories: CategoryBreakdown[] = Object.entries(catMap)
    .map(([categoryId, { sum, count }]) => {
      const cat = categories.find((c) => c.id === categoryId)
      return {
        categoryId,
        categoryName: cat?.name ?? "Unknown",
        color: cat?.color ?? "#6b7280",
        total: round2(sum),
        percentage: totalExpenses > 0 ? round2((sum / totalExpenses) * 100) : 0,
        count,
      }
    })
    .sort((a, b) => b.total - a.total)

  return {
    year,
    totalIncome: round2(totalIncome),
    totalExpenses: round2(totalExpenses),
    netBalance: round2(totalIncome - totalExpenses),
    monthlyBreakdown,
    topExpenseCategories,
  }
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
    if (filters.minAmount !== undefined && t.amount < filters.minAmount) return false
    if (filters.maxAmount !== undefined && t.amount > filters.maxAmount) return false
    if (filters.recurring && !t.isRecurring) return false
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

export function getCumulativeBalance(transactions: Transaction[]): { month: string; balance: number }[] {
  if (transactions.length === 0) return []

  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
  const firstMonth = sorted[0].date.slice(0, 7)
  const currentMonth = getMonthKey()
  if (firstMonth > currentMonth) return []

  const monthlyNet: Record<string, number> = {}
  for (const t of sorted) {
    const m = t.date.slice(0, 7)
    monthlyNet[m] = (monthlyNet[m] ?? 0) + (t.type === "income" ? t.amount : -t.amount)
  }

  const result: { month: string; balance: number }[] = []
  let cumulative = 0
  let m = firstMonth
  while (m <= currentMonth) {
    cumulative = round2(cumulative + (monthlyNet[m] ?? 0))
    result.push({ month: m, balance: cumulative })
    m = addMonths(m, 1)
  }
  return result
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

export function getSpendingInsights(
  transactions: Transaction[],
  monthKey: string,
  categories: Category[],
  fmt: (n: number) => string
): Insight[] {
  const prevMonthKey = addMonths(monthKey, -1)
  const curTxns = transactions.filter((t) => t.date.startsWith(monthKey))
  const prevTxns = transactions.filter((t) => t.date.startsWith(prevMonthKey))

  if (curTxns.length < 2) return []

  let curIncome = 0, curExpenses = 0
  for (const t of curTxns) {
    if (t.type === "income") curIncome += t.amount
    else curExpenses += t.amount
  }
  let prevExpenses = 0, prevIncome = 0
  for (const t of prevTxns) {
    if (t.type === "expense") prevExpenses += t.amount
    else prevIncome += t.amount
  }

  const curBreakdown = getExpenseBreakdown(transactions, monthKey, categories)
  const prevBreakdown = getExpenseBreakdown(transactions, prevMonthKey, categories)

  const insights: Insight[] = []

  // 1. Month-over-month total expenses
  if (prevExpenses > 0 && curExpenses > 0) {
    const pct = ((curExpenses - prevExpenses) / prevExpenses) * 100
    if (Math.abs(pct) >= 5) {
      insights.push({
        id: "expense-mom",
        type: pct < 0 ? "positive" : "warning",
        title: pct < 0
          ? `Expenses down ${Math.abs(pct).toFixed(0)}% vs last month`
          : `Expenses up ${pct.toFixed(0)}% vs last month`,
        detail: `${fmt(curExpenses)} this month vs ${fmt(prevExpenses)} last month`,
      })
    }
  }

  // 2. Biggest category spike (≥ 30% AND ≥ $10 more)
  for (const cur of curBreakdown) {
    const prev = prevBreakdown.find((p) => p.categoryId === cur.categoryId)
    if (!prev || prev.total === 0) continue
    const pct = ((cur.total - prev.total) / prev.total) * 100
    if (pct >= 30 && cur.total - prev.total >= 10) {
      insights.push({
        id: `spike-${cur.categoryId}`,
        type: "warning",
        title: `${cur.categoryName} up ${pct.toFixed(0)}% vs last month`,
        detail: `${fmt(cur.total)} this month vs ${fmt(prev.total)} last month`,
      })
      break // only the biggest spike
    }
  }

  // 3. Top expense category
  if (curBreakdown.length > 0) {
    const top = curBreakdown[0]
    insights.push({
      id: "top-category",
      type: "neutral",
      title: `${top.categoryName} is your top expense`,
      detail: `${fmt(top.total)} — ${top.percentage.toFixed(0)}% of spending`,
    })
  }

  // 4. Savings rate or overspending
  if (curIncome > 0) {
    const curNet = curIncome - curExpenses
    const rate = (curNet / curIncome) * 100
    if (curNet < 0) {
      insights.push({
        id: "overspending",
        type: "negative",
        title: "Spending exceeds income this month",
        detail: `${fmt(Math.abs(curNet))} over income`,
      })
    } else if (rate >= 10) {
      insights.push({
        id: "savings-rate",
        type: "positive",
        title: `Saving ${rate.toFixed(0)}% of income this month`,
        detail: `${fmt(curNet)} saved so far`,
      })
    }
  }

  const order: Record<Insight["type"], number> = { negative: 0, warning: 1, positive: 2, neutral: 3 }
  return insights.sort((a, b) => order[a.type] - order[b.type]).slice(0, 4)
}

import { describe, it, expect } from "vitest"
import { getDashboardStats, getExpenseBreakdown, getIncomeBreakdown, getBudgetStatus, getMonthlyTrend, getCumulativeBalance, getPeriodDateRange, filterTransactions, getTopTransactions } from "../analytics"
import { Transaction, Category } from "@/types"

const makeTransaction = (overrides: Partial<Transaction>): Transaction => ({
  id: "t1",
  type: "expense",
  amount: 10,
  categoryId: "cat1",
  description: "Test",
  date: "2026-06-01",
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
  ...overrides,
})

const makeCategory = (overrides: Partial<Category>): Category => ({
  id: "cat1",
  name: "Food",
  type: "expense",
  color: "#f00",
  isDefault: false,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
})

describe("getDashboardStats", () => {
  it("sums income and expenses for the given month", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", amount: 1000, date: "2026-06-01" }),
      makeTransaction({ id: "2", type: "expense", amount: 300, date: "2026-06-15" }),
      makeTransaction({ id: "3", type: "expense", amount: 200, date: "2026-05-10" }),
    ]
    const stats = getDashboardStats(transactions, "2026-06")
    expect(stats.currentMonthIncome).toBe(1000)
    expect(stats.currentMonthExpenses).toBe(300)
    expect(stats.currentMonthNet).toBe(700)
    expect(stats.transactionCountThisMonth).toBe(2)
  })

  it("applies round2 to avoid floating point drift", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "expense", amount: 0.1, date: "2026-06-01" }),
      makeTransaction({ id: "2", type: "expense", amount: 0.2, date: "2026-06-02" }),
    ]
    const stats = getDashboardStats(transactions, "2026-06")
    expect(stats.currentMonthExpenses).toBe(0.3)
  })

  it("returns zero for a month with no transactions", () => {
    const stats = getDashboardStats([], "2026-06")
    expect(stats.currentMonthIncome).toBe(0)
    expect(stats.currentMonthExpenses).toBe(0)
    expect(stats.currentMonthNet).toBe(0)
  })
})

describe("getExpenseBreakdown", () => {
  const categories = [makeCategory()]

  it("groups expenses by category", () => {
    const transactions = [
      makeTransaction({ id: "1", amount: 50, date: "2026-06-01" }),
      makeTransaction({ id: "2", amount: 30, date: "2026-06-05" }),
    ]
    const breakdown = getExpenseBreakdown(transactions, "2026-06", categories)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].total).toBe(80)
    expect(breakdown[0].count).toBe(2)
    expect(breakdown[0].percentage).toBe(100)
  })

  it("excludes income transactions", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", amount: 500, date: "2026-06-01" }),
      makeTransaction({ id: "2", amount: 100, date: "2026-06-01" }),
    ]
    const breakdown = getExpenseBreakdown(transactions, "2026-06", categories)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].total).toBe(100)
  })

  it("returns empty array when no expenses", () => {
    const breakdown = getExpenseBreakdown([], "2026-06", categories)
    expect(breakdown).toHaveLength(0)
  })

  it("labels unknown categories as Unknown", () => {
    const transactions = [makeTransaction({ id: "1", categoryId: "nonexistent", amount: 10, date: "2026-06-01" })]
    const breakdown = getExpenseBreakdown(transactions, "2026-06", [])
    expect(breakdown[0].categoryName).toBe("Unknown")
  })
})

describe("getBudgetStatus", () => {
  it("returns budgeted categories with spending", () => {
    const categories = [makeCategory({ budget: 100 })]
    const transactions = [makeTransaction({ id: "1", amount: 60, date: "2026-06-01" })]
    const status = getBudgetStatus(transactions, "2026-06", categories)
    expect(status).toHaveLength(1)
    expect(status[0].spent).toBe(60)
    expect(status[0].percentage).toBe(60)
    expect(status[0].isOverBudget).toBe(false)
  })

  it("flags over-budget categories", () => {
    const categories = [makeCategory({ budget: 50 })]
    const transactions = [makeTransaction({ id: "1", amount: 75, date: "2026-06-01" })]
    const status = getBudgetStatus(transactions, "2026-06", categories)
    expect(status[0].isOverBudget).toBe(true)
  })

  it("returns empty array when no categories have budgets", () => {
    const categories = [makeCategory()]
    const status = getBudgetStatus([], "2026-06", categories)
    expect(status).toHaveLength(0)
  })

  it("month mode matches the exact pre-migration month behavior (parity)", () => {
    const categories = [makeCategory({ budget: 100 })]
    const transactions = [makeTransaction({ id: "1", amount: 60, date: "2026-06-01" })]
    const status = getBudgetStatus(transactions, "2026-06", categories)
    expect(status[0].budget).toBe(100)
    expect(status[0].percentage).toBe(60)
  })

  it("annualizes the monthly budget (x12) when the period is a year", () => {
    const categories = [makeCategory({ budget: 100 })]
    const transactions = [
      makeTransaction({ id: "1", amount: 600, date: "2026-01-15" }),
      makeTransaction({ id: "2", amount: 600, date: "2026-06-15" }),
    ]
    const status = getBudgetStatus(transactions, "2026", categories)
    expect(status[0].budget).toBe(1200) // 100 * 12
    expect(status[0].spent).toBe(1200)
    expect(status[0].percentage).toBe(100)
    expect(status[0].isOverBudget).toBe(false)
  })
})

describe("getMonthlyTrend — period generalization", () => {
  it("preserves the exact pre-migration default (6 trailing months ending today)", () => {
    expect(getMonthlyTrend([])).toHaveLength(6)
    expect(getMonthlyTrend([], 12)).toHaveLength(12)
  })

  it("supports a non-6-month trailing window ending at a specific month", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", amount: 500, date: "2025-11-10" }),
      makeTransaction({ id: "2", type: "expense", amount: 100, date: "2026-01-10" }),
    ]
    const trend = getMonthlyTrend(transactions, 3, "2026-01")
    expect(trend).toHaveLength(3)
    expect(trend.map((t) => t.month)).toEqual(["2025-11", "2025-12", "2026-01"])
    expect(trend[0].totalIncome).toBe(500)
    expect(trend[2].totalExpenses).toBe(100)
  })

  it("returns all 12 months of the selected year, ignoring monthCount", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", amount: 1000, date: "2026-03-01" }),
      makeTransaction({ id: "2", type: "expense", amount: 999, date: "2025-03-01" }),
    ]
    const trend = getMonthlyTrend(transactions, 6, "2026")
    expect(trend).toHaveLength(12)
    expect(trend[0].month).toBe("2026-01")
    expect(trend[11].month).toBe("2026-12")
    expect(trend[2].totalIncome).toBe(1000) // March = index 2
    // 2025's data must not leak into 2026's year trend
    expect(trend.every((t) => t.totalExpenses === 0)).toBe(true)
  })

  it("handles the year boundary correctly in trailing-window mode", () => {
    const transactions = [makeTransaction({ id: "1", type: "income", amount: 200, date: "2025-12-20" })]
    const trend = getMonthlyTrend(transactions, 2, "2026-01")
    expect(trend.map((t) => t.month)).toEqual(["2025-12", "2026-01"])
    expect(trend[0].totalIncome).toBe(200)
  })
})

describe("getCumulativeBalance — period generalization", () => {
  it("bounds the trend to the end of a selected past month, excluding later data", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", amount: 100, date: "2026-01-15" }),
      makeTransaction({ id: "2", type: "income", amount: 500, date: "2026-06-15" }),
    ]
    const result = getCumulativeBalance(transactions, "2026-01")
    expect(result).toHaveLength(1)
    expect(result[0].month).toBe("2026-01")
    expect(result[0].balance).toBe(100)
  })

  it("bounds the trend to December of a selected year", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", amount: 100, date: "2026-01-15" }),
      makeTransaction({ id: "2", type: "income", amount: 50, date: "2027-01-15" }),
    ]
    const result = getCumulativeBalance(transactions, "2026")
    expect(result[result.length - 1].month).toBe("2026-12")
    expect(result[result.length - 1].balance).toBe(100)
  })

  it("returns an empty array for an empty period", () => {
    expect(getCumulativeBalance([], "2026")).toEqual([])
  })
})

describe("getPeriodDateRange", () => {
  it("computes the full-month range for a month key", () => {
    expect(getPeriodDateRange("2026-02")).toEqual({ dateFrom: "2026-02-01", dateTo: "2026-02-28" })
  })

  it("computes the correct leap-year February range", () => {
    expect(getPeriodDateRange("2024-02")).toEqual({ dateFrom: "2024-02-01", dateTo: "2024-02-29" })
  })

  it("computes the full-year range for a year key", () => {
    expect(getPeriodDateRange("2026")).toEqual({ dateFrom: "2026-01-01", dateTo: "2026-12-31" })
  })
})

describe("filterTransactions", () => {
  const transactions = [
    makeTransaction({ id: "1", type: "income", amount: 500, date: "2026-06-01", description: "Salary", categoryId: "cat1" }),
    makeTransaction({ id: "2", type: "expense", amount: 50, date: "2026-06-10", description: "Lunch", categoryId: "cat2", tags: ["food"] }),
    makeTransaction({ id: "3", type: "expense", amount: 200, date: "2026-05-20", description: "Rent", categoryId: "cat1" }),
  ]

  it("filters by type", () => {
    const result = filterTransactions(transactions, { type: "income" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("filters by category", () => {
    const result = filterTransactions(transactions, { categoryId: "cat2" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("filters by date range", () => {
    const result = filterTransactions(transactions, { dateFrom: "2026-06-01", dateTo: "2026-06-30" })
    expect(result).toHaveLength(2)
  })

  it("filters by search term in description", () => {
    const result = filterTransactions(transactions, { search: "lunch" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("filters by tag", () => {
    const result = filterTransactions(transactions, { tag: "food" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("returns all when no filters applied", () => {
    expect(filterTransactions(transactions, {})).toHaveLength(3)
  })
})

describe("getTopTransactions", () => {
  it("returns top N transactions by amount for the month", () => {
    const transactions = [
      makeTransaction({ id: "1", amount: 300, date: "2026-06-01" }),
      makeTransaction({ id: "2", amount: 50, date: "2026-06-01" }),
      makeTransaction({ id: "3", amount: 150, date: "2026-06-01" }),
      makeTransaction({ id: "4", amount: 999, date: "2026-05-01" }),
    ]
    const top = getTopTransactions(transactions, "2026-06", 2)
    expect(top).toHaveLength(2)
    expect(top[0].amount).toBe(300)
    expect(top[1].amount).toBe(150)
  })
})

// ─── P8: period generalization (month + year) ──────────────────────────────

describe("getDashboardStats — period generalization", () => {
  const transactions = [
    makeTransaction({ id: "1", type: "income", amount: 1000, date: "2025-12-15" }),
    makeTransaction({ id: "2", type: "expense", amount: 400, date: "2025-12-20" }),
    makeTransaction({ id: "3", type: "income", amount: 1200, date: "2026-01-05" }),
    makeTransaction({ id: "4", type: "expense", amount: 300, date: "2026-01-15" }),
    makeTransaction({ id: "5", type: "expense", amount: 999, date: "2027-01-15" }),
  ]

  it("month mode matches the exact pre-migration month behavior", () => {
    // Same call shape Monthly/Dashboard have always used - this is the parity check.
    const stats = getDashboardStats(transactions, "2026-01")
    expect(stats.currentMonthIncome).toBe(1200)
    expect(stats.currentMonthExpenses).toBe(300)
    expect(stats.currentMonthNet).toBe(900)
    expect(stats.previousMonthIncome).toBe(1000)
    expect(stats.previousMonthExpenses).toBe(400)
    expect(stats.transactionCountThisMonth).toBe(2)
  })

  it("handles the December -> January month boundary correctly", () => {
    const stats = getDashboardStats(transactions, "2026-01")
    // previous period must be Dec 2025, not Jan 2025 or some other rollover bug
    expect(stats.previousMonthIncome).toBe(1000)
    expect(stats.previousMonthExpenses).toBe(400)
  })

  it("year mode aggregates the whole year and compares to the previous year", () => {
    const stats = getDashboardStats(transactions, "2026")
    expect(stats.currentMonthIncome).toBe(1200)
    expect(stats.currentMonthExpenses).toBe(300)
    expect(stats.currentMonthNet).toBe(900)
    expect(stats.previousMonthIncome).toBe(1000)
    expect(stats.previousMonthExpenses).toBe(400)
    expect(stats.transactionCountThisMonth).toBe(2)
  })

  it("does not leak transactions from an unrelated year into year mode", () => {
    const stats = getDashboardStats(transactions, "2026")
    // 2027's $999 expense must not appear in 2026's totals
    expect(stats.currentMonthExpenses).toBe(300)
  })

  it("returns zero for an empty year", () => {
    const stats = getDashboardStats(transactions, "2099")
    expect(stats.currentMonthIncome).toBe(0)
    expect(stats.currentMonthExpenses).toBe(0)
    expect(stats.transactionCountThisMonth).toBe(0)
  })
})

describe("getExpenseBreakdown — period generalization", () => {
  const categories = [makeCategory({ id: "cat1", name: "Food" }), makeCategory({ id: "cat2", name: "Transport" })]

  it("year mode aggregates expenses across all months of that year", () => {
    const transactions = [
      makeTransaction({ id: "1", categoryId: "cat1", amount: 50, date: "2026-01-05" }),
      makeTransaction({ id: "2", categoryId: "cat1", amount: 30, date: "2026-06-20" }),
      makeTransaction({ id: "3", categoryId: "cat2", amount: 999, date: "2025-01-05" }),
    ]
    const breakdown = getExpenseBreakdown(transactions, "2026", categories)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].categoryName).toBe("Food")
    expect(breakdown[0].total).toBe(80)
  })

  it("returns empty array for a year with no expenses", () => {
    expect(getExpenseBreakdown([], "2026", categories)).toHaveLength(0)
  })
})

describe("getIncomeBreakdown", () => {
  const categories = [makeCategory({ id: "cat1", name: "Salary", type: "income" }), makeCategory({ id: "cat2", name: "Food" })]

  it("groups income by category for a month", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", categoryId: "cat1", amount: 2000, date: "2026-06-01" }),
      makeTransaction({ id: "2", type: "expense", categoryId: "cat2", amount: 40, date: "2026-06-01" }),
    ]
    const breakdown = getIncomeBreakdown(transactions, "2026-06", categories)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].categoryName).toBe("Salary")
    expect(breakdown[0].total).toBe(2000)
  })

  it("groups income across a whole year", () => {
    const transactions = [
      makeTransaction({ id: "1", type: "income", categoryId: "cat1", amount: 1000, date: "2026-01-01" }),
      makeTransaction({ id: "2", type: "income", categoryId: "cat1", amount: 1000, date: "2026-11-01" }),
      makeTransaction({ id: "3", type: "income", categoryId: "cat1", amount: 999, date: "2025-11-01" }),
    ]
    const breakdown = getIncomeBreakdown(transactions, "2026", categories)
    expect(breakdown).toHaveLength(1)
    expect(breakdown[0].total).toBe(2000)
  })

  it("returns empty array when there is no income in the period", () => {
    const transactions = [makeTransaction({ id: "1", type: "expense", categoryId: "cat2", amount: 40, date: "2026-06-01" })]
    expect(getIncomeBreakdown(transactions, "2026-06", categories)).toHaveLength(0)
  })
})

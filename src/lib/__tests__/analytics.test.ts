import { describe, it, expect } from "vitest"
import { getDashboardStats, getExpenseBreakdown, getBudgetStatus, filterTransactions, getTopTransactions } from "../analytics"
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

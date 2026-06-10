import { describe, it, expect } from "vitest"
import { Transaction, Category } from "@/types"
import {
  getDashboardStats,
  getExpenseBreakdown,
  getBudgetStatus,
  getMonthlyTrend,
  getAnnualSummary,
  filterTransactions,
  getSortedTransactions,
  getRecentTransactions,
} from "@/lib/analytics"

const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: "t1",
  type: "expense",
  amount: 100,
  categoryId: "cat_food",
  description: "Groceries",
  date: "2024-06-15",
  createdAt: "2024-06-15T10:00:00Z",
  updatedAt: "2024-06-15T10:00:00Z",
  ...overrides,
})

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat_food",
  name: "Food",
  type: "expense",
  color: "#f97316",
  isDefault: true,
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
})

// ─── getDashboardStats ────────────────────────────────────────────────────────

describe("getDashboardStats", () => {
  it("returns all zeros for empty transaction array", () => {
    const s = getDashboardStats([], "2024-06")
    expect(s.currentMonthIncome).toBe(0)
    expect(s.currentMonthExpenses).toBe(0)
    expect(s.currentMonthNet).toBe(0)
    expect(s.allTimeBalance).toBe(0)
    expect(s.transactionCountThisMonth).toBe(0)
  })

  it("sums income and expenses for the selected month only", () => {
    const txns = [
      makeTransaction({ id: "t1", type: "income", amount: 3000, date: "2024-06-01" }),
      makeTransaction({ id: "t2", type: "expense", amount: 500, date: "2024-06-15" }),
      makeTransaction({ id: "t3", type: "expense", amount: 200, date: "2024-05-20" }),
    ]
    const s = getDashboardStats(txns, "2024-06")
    expect(s.currentMonthIncome).toBe(3000)
    expect(s.currentMonthExpenses).toBe(500)
    expect(s.currentMonthNet).toBe(2500)
    expect(s.transactionCountThisMonth).toBe(2)
  })

  it("excludes transactions outside the selected month", () => {
    const txns = [makeTransaction({ date: "2024-05-01" })]
    const s = getDashboardStats(txns, "2024-06")
    expect(s.currentMonthExpenses).toBe(0)
    expect(s.transactionCountThisMonth).toBe(0)
  })

  it("allTimeBalance spans all months", () => {
    const txns = [
      makeTransaction({ id: "t1", type: "income", amount: 1000, date: "2024-01-01" }),
      makeTransaction({ id: "t2", type: "expense", amount: 400, date: "2024-06-01" }),
    ]
    expect(getDashboardStats(txns, "2024-06").allTimeBalance).toBe(600)
  })

  it("currentMonthNet can be negative", () => {
    const txns = [makeTransaction({ type: "expense", amount: 999, date: "2024-06-01" })]
    expect(getDashboardStats(txns, "2024-06").currentMonthNet).toBe(-999)
  })
})

// ─── getExpenseBreakdown ──────────────────────────────────────────────────────

describe("getExpenseBreakdown", () => {
  it("returns empty array when no expenses in month", () => {
    expect(getExpenseBreakdown([], "2024-06", [])).toEqual([])
  })

  it("returns empty array when only income transactions exist", () => {
    const txns = [makeTransaction({ type: "income", date: "2024-06-01" })]
    expect(getExpenseBreakdown(txns, "2024-06", [])).toEqual([])
  })

  it("single category: 100% share, correct count and total", () => {
    const txns = [
      makeTransaction({ id: "t1", amount: 100, date: "2024-06-01" }),
      makeTransaction({ id: "t2", amount: 50, date: "2024-06-10" }),
    ]
    const result = getExpenseBreakdown(txns, "2024-06", [makeCategory()])
    expect(result).toHaveLength(1)
    expect(result[0].percentage).toBe(100)
    expect(result[0].count).toBe(2)
    expect(result[0].total).toBe(150)
  })

  it("multiple categories sorted by total descending", () => {
    const txns = [
      makeTransaction({ id: "t1", categoryId: "cat_food", amount: 100, date: "2024-06-01" }),
      makeTransaction({ id: "t2", categoryId: "cat_transport", amount: 300, date: "2024-06-02" }),
    ]
    const cats = [
      makeCategory({ id: "cat_food", name: "Food" }),
      makeCategory({ id: "cat_transport", name: "Transport" }),
    ]
    const result = getExpenseBreakdown(txns, "2024-06", cats)
    expect(result[0].categoryName).toBe("Transport")
    expect(result[1].categoryName).toBe("Food")
  })

  it("percentages sum to 100", () => {
    const txns = [
      makeTransaction({ id: "t1", categoryId: "cat_food", amount: 100, date: "2024-06-01" }),
      makeTransaction({ id: "t2", categoryId: "cat_transport", amount: 300, date: "2024-06-02" }),
    ]
    const cats = [makeCategory({ id: "cat_food" }), makeCategory({ id: "cat_transport" })]
    const result = getExpenseBreakdown(txns, "2024-06", cats)
    const sum = result.reduce((s, r) => s + r.percentage, 0)
    expect(sum).toBeCloseTo(100)
  })

  it("uses fallback name and color for unknown categoryId", () => {
    const txns = [makeTransaction({ categoryId: "unknown_id", date: "2024-06-01" })]
    const result = getExpenseBreakdown(txns, "2024-06", [])
    expect(result[0].categoryName).toBe("Unknown")
    expect(result[0].color).toBe("#6b7280")
  })
})

// ─── getBudgetStatus ──────────────────────────────────────────────────────────

describe("getBudgetStatus", () => {
  it("returns empty array when no categories have a budget", () => {
    expect(getBudgetStatus([], "2024-06", [makeCategory({ budget: undefined })])).toEqual([])
  })

  it("isOverBudget false when spent < budget", () => {
    const cats = [makeCategory({ budget: 500 })]
    const txns = [makeTransaction({ categoryId: "cat_food", amount: 200, date: "2024-06-01" })]
    const result = getBudgetStatus(txns, "2024-06", cats)
    expect(result[0].spent).toBe(200)
    expect(result[0].isOverBudget).toBe(false)
    expect(result[0].percentage).toBe(40)
  })

  it("isOverBudget true when spent > budget", () => {
    const cats = [makeCategory({ budget: 100 })]
    const txns = [makeTransaction({ categoryId: "cat_food", amount: 150, date: "2024-06-01" })]
    const result = getBudgetStatus(txns, "2024-06", cats)
    expect(result[0].isOverBudget).toBe(true)
    expect(result[0].percentage).toBe(150)
  })

  it("category with no expenses this month has spent of 0", () => {
    const cats = [makeCategory({ budget: 300 })]
    const result = getBudgetStatus([], "2024-06", cats)
    expect(result[0].spent).toBe(0)
    expect(result[0].percentage).toBe(0)
  })

  it("ignores income transactions when calculating spent", () => {
    const cats = [makeCategory({ budget: 200 })]
    const txns = [makeTransaction({ type: "income", categoryId: "cat_food", amount: 999, date: "2024-06-01" })]
    const result = getBudgetStatus(txns, "2024-06", cats)
    expect(result[0].spent).toBe(0)
  })
})

// ─── getMonthlyTrend ──────────────────────────────────────────────────────────

describe("getMonthlyTrend", () => {
  it("returns 6 items by default", () => {
    expect(getMonthlyTrend([])).toHaveLength(6)
  })

  it("returns requested count", () => {
    expect(getMonthlyTrend([], 12)).toHaveLength(12)
  })

  it("each item has a YYYY-MM month key", () => {
    getMonthlyTrend([]).forEach((item) => {
      expect(item.month).toMatch(/^\d{4}-\d{2}$/)
    })
  })

  it("month with no transactions has all zeros", () => {
    const item = getMonthlyTrend([])[0]
    expect(item.totalIncome).toBe(0)
    expect(item.totalExpenses).toBe(0)
    expect(item.transactionCount).toBe(0)
  })

  it("months ordered oldest to newest (index 0 is oldest)", () => {
    const result = getMonthlyTrend([])
    for (let i = 1; i < result.length; i++) {
      expect(result[i].month > result[i - 1].month).toBe(true)
    }
  })

  it("netBalance = totalIncome - totalExpenses", () => {
    getMonthlyTrend([]).forEach((item) => {
      expect(item.netBalance).toBe(item.totalIncome - item.totalExpenses)
    })
  })
})

// ─── getAnnualSummary ─────────────────────────────────────────────────────────

describe("getAnnualSummary", () => {
  it("returns correct year with all zeros for no data", () => {
    const result = getAnnualSummary([], 2024, [])
    expect(result.year).toBe(2024)
    expect(result.totalIncome).toBe(0)
    expect(result.totalExpenses).toBe(0)
    expect(result.netBalance).toBe(0)
    expect(result.topExpenseCategories).toHaveLength(0)
  })

  it("monthlyBreakdown always has exactly 12 items", () => {
    expect(getAnnualSummary([], 2024, []).monthlyBreakdown).toHaveLength(12)
  })

  it("ignores transactions from other years", () => {
    const txns = [makeTransaction({ type: "income", amount: 5000, date: "2023-06-01" })]
    expect(getAnnualSummary(txns, 2024, []).totalIncome).toBe(0)
  })

  it("sums income and expenses across all months in the year", () => {
    const txns = [
      makeTransaction({ id: "t1", type: "income", amount: 1000, date: "2024-01-01" }),
      makeTransaction({ id: "t2", type: "income", amount: 2000, date: "2024-06-01" }),
      makeTransaction({ id: "t3", type: "expense", amount: 500, date: "2024-03-01" }),
    ]
    const result = getAnnualSummary(txns, 2024, [])
    expect(result.totalIncome).toBe(3000)
    expect(result.totalExpenses).toBe(500)
    expect(result.netBalance).toBe(2500)
  })

  it("topExpenseCategories sorted by total descending", () => {
    const txns = [
      makeTransaction({ id: "t1", categoryId: "cat_food", amount: 200, date: "2024-03-01" }),
      makeTransaction({ id: "t2", categoryId: "cat_transport", amount: 500, date: "2024-04-01" }),
    ]
    const cats = [
      makeCategory({ id: "cat_food", name: "Food" }),
      makeCategory({ id: "cat_transport", name: "Transport" }),
    ]
    const result = getAnnualSummary(txns, 2024, cats)
    expect(result.topExpenseCategories[0].categoryName).toBe("Transport")
  })
})

// ─── filterTransactions ───────────────────────────────────────────────────────

describe("filterTransactions", () => {
  const txns = [
    makeTransaction({ id: "t1", type: "income", categoryId: "cat_salary", date: "2024-06-01", description: "Salary", tags: ["work"] }),
    makeTransaction({ id: "t2", type: "expense", categoryId: "cat_food", date: "2024-06-15", description: "Groceries", notes: "weekly shop" }),
    makeTransaction({ id: "t3", type: "expense", categoryId: "cat_transport", date: "2024-07-01", description: "Bus pass" }),
  ]

  it("returns all transactions with empty filters", () => {
    expect(filterTransactions(txns, {})).toHaveLength(3)
  })

  it("filters by type income", () => {
    const result = filterTransactions(txns, { type: "income" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t1")
  })

  it("filters by type expense", () => {
    const result = filterTransactions(txns, { type: "expense" })
    expect(result).toHaveLength(2)
  })

  it("filters by categoryId", () => {
    const result = filterTransactions(txns, { categoryId: "cat_food" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t2")
  })

  it("filters by dateFrom (inclusive)", () => {
    const result = filterTransactions(txns, { dateFrom: "2024-06-15" })
    const ids = result.map((t) => t.id)
    expect(ids).toContain("t2")
    expect(ids).toContain("t3")
    expect(ids).not.toContain("t1")
  })

  it("filters by dateTo (inclusive)", () => {
    const result = filterTransactions(txns, { dateTo: "2024-06-15" })
    const ids = result.map((t) => t.id)
    expect(ids).toContain("t1")
    expect(ids).toContain("t2")
    expect(ids).not.toContain("t3")
  })

  it("searches description case-insensitively", () => {
    expect(filterTransactions(txns, { search: "GROCERIES" })).toHaveLength(1)
  })

  it("searches notes", () => {
    expect(filterTransactions(txns, { search: "weekly" })).toHaveLength(1)
  })

  it("searches tags", () => {
    expect(filterTransactions(txns, { search: "work" })).toHaveLength(1)
  })

  it("filters by exact tag", () => {
    const result = filterTransactions(txns, { tag: "work" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t1")
  })

  it("AND logic: combined type + category filters", () => {
    const result = filterTransactions(txns, { type: "expense", categoryId: "cat_food" })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("t2")
  })

  it("returns empty array when no transactions match", () => {
    expect(filterTransactions(txns, { search: "zzznomatch" })).toHaveLength(0)
  })
})

// ─── getSortedTransactions ────────────────────────────────────────────────────

describe("getSortedTransactions", () => {
  it("sorts by date descending", () => {
    const txns = [
      makeTransaction({ id: "t1", date: "2024-01-01", createdAt: "2024-01-01T00:00:00Z" }),
      makeTransaction({ id: "t2", date: "2024-06-01", createdAt: "2024-06-01T00:00:00Z" }),
    ]
    expect(getSortedTransactions(txns)[0].id).toBe("t2")
  })

  it("tie-breaks by createdAt descending", () => {
    const txns = [
      makeTransaction({ id: "t1", date: "2024-06-01", createdAt: "2024-06-01T08:00:00Z" }),
      makeTransaction({ id: "t2", date: "2024-06-01", createdAt: "2024-06-01T10:00:00Z" }),
    ]
    expect(getSortedTransactions(txns)[0].id).toBe("t2")
  })

  it("does not mutate the original array", () => {
    const txns = [
      makeTransaction({ id: "t1", date: "2024-01-01", createdAt: "2024-01-01T00:00:00Z" }),
      makeTransaction({ id: "t2", date: "2024-06-01", createdAt: "2024-06-01T00:00:00Z" }),
    ]
    const firstBefore = txns[0].id
    getSortedTransactions(txns)
    expect(txns[0].id).toBe(firstBefore)
  })
})

// ─── getRecentTransactions ────────────────────────────────────────────────────

describe("getRecentTransactions", () => {
  it("returns at most count items", () => {
    const txns = Array.from({ length: 10 }, (_, i) =>
      makeTransaction({
        id: `t${i}`,
        date: `2024-06-${String(i + 1).padStart(2, "0")}`,
        createdAt: `2024-06-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
      })
    )
    expect(getRecentTransactions(txns, 3)).toHaveLength(3)
  })

  it("returns fewer when array shorter than count", () => {
    expect(getRecentTransactions([makeTransaction()], 5)).toHaveLength(1)
  })

  it("returns empty array for empty input", () => {
    expect(getRecentTransactions([], 5)).toEqual([])
  })

  it("returns the most recent items", () => {
    const txns = [
      makeTransaction({ id: "old", date: "2024-01-01", createdAt: "2024-01-01T00:00:00Z" }),
      makeTransaction({ id: "new", date: "2024-12-01", createdAt: "2024-12-01T00:00:00Z" }),
    ]
    expect(getRecentTransactions(txns, 1)[0].id).toBe("new")
  })
})

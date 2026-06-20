import { describe, it, expect } from "vitest"
import { Transaction, Category } from "@/types"
import { transactionsToCSV } from "@/lib/csv"

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

describe("transactionsToCSV", () => {
  it("produces correct header row when no transactions", () => {
    expect(transactionsToCSV([], [])).toBe("Date,Type,Category,Description,Amount")
  })

  it("income row has positive amount", () => {
    const t = makeTransaction({ type: "income", amount: 500 })
    const lines = transactionsToCSV([t], [makeCategory()]).split("\n")
    expect(lines[1]).toContain("500.00")
    expect(lines[1]).not.toContain("-500.00")
  })

  it("expense row has negative amount", () => {
    const t = makeTransaction({ amount: 200 })
    const lines = transactionsToCSV([t], [makeCategory()]).split("\n")
    expect(lines[1]).toContain("-200.00")
  })

  it("unknown categoryId falls back to Unknown", () => {
    const t = makeTransaction({ categoryId: "unknown_id" })
    expect(transactionsToCSV([t], [])).toContain("Unknown")
  })

  it("escapes double-quotes in description per RFC 4180", () => {
    const t = makeTransaction({ description: 'Say "hello"' })
    const csv = transactionsToCSV([t], [makeCategory()])
    expect(csv).toContain('""hello""')
  })

  it("sorts rows by date descending", () => {
    const txns = [
      makeTransaction({ id: "t1", date: "2024-06-01", description: "First" }),
      makeTransaction({ id: "t2", date: "2024-07-01", description: "Second" }),
    ]
    const lines = transactionsToCSV(txns, [makeCategory()]).split("\n")
    expect(lines[1]).toContain("Second")
    expect(lines[2]).toContain("First")
  })

  it("neutralises = formula injection in description", () => {
    const t = makeTransaction({ description: "=SUM(A1:A10)" })
    const csv = transactionsToCSV([t], [makeCategory()])
    expect(csv).toContain("\"'=SUM")
  })

  it("neutralises + formula injection", () => {
    const t = makeTransaction({ description: "+cmd|' /C calc'" })
    expect(transactionsToCSV([t], [makeCategory()])).toContain("\"'+cmd")
  })

  it("neutralises - formula injection", () => {
    const t = makeTransaction({ description: "-2+3" })
    expect(transactionsToCSV([t], [makeCategory()])).toContain("\"'-2+3")
  })

  it("neutralises formula injection in category name", () => {
    const t = makeTransaction({ categoryId: "cat_bad" })
    const cat = makeCategory({ id: "cat_bad", name: "=EVIL()" })
    expect(transactionsToCSV([t], [cat])).toContain("\"'=EVIL()")
  })
})

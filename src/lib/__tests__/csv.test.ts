import { describe, it, expect } from "vitest"
import { transactionsToCSV } from "../csv"
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

const categories: Category[] = [
  {
    id: "cat1",
    name: "Food",
    type: "expense",
    color: "#f00",
    isDefault: false,
    createdAt: "2026-01-01T00:00:00Z",
  },
]

describe("transactionsToCSV", () => {
  it("outputs a header row and one data row", () => {
    const csv = transactionsToCSV([makeTransaction({})], categories)
    const lines = csv.split("\n")
    expect(lines[0]).toBe("Date,Type,Category,Description,Amount")
    expect(lines).toHaveLength(2)
  })

  it("exports income amounts as positive", () => {
    const csv = transactionsToCSV([makeTransaction({ type: "income", amount: 100 })], categories)
    expect(csv).toContain("100.00")
    expect(csv).not.toContain("-100.00")
  })

  it("exports expense amounts as negative", () => {
    const csv = transactionsToCSV([makeTransaction({ type: "expense", amount: 50 })], categories)
    expect(csv).toContain("-50.00")
  })

  it("wraps all string fields in double quotes", () => {
    const csv = transactionsToCSV([makeTransaction({ description: "Lunch" })], categories)
    expect(csv).toContain('"Lunch"')
  })

  it("escapes double quotes inside values", () => {
    const csv = transactionsToCSV([makeTransaction({ description: 'Say "hello"' })], categories)
    expect(csv).toContain('"Say ""hello"""')
  })

  it("prefixes formula-injection characters with single quote", () => {
    const dangerous = ["=SUM(A1)", "+cmd", "-calc", "@SUM"]
    for (const desc of dangerous) {
      const csv = transactionsToCSV([makeTransaction({ description: desc })], categories)
      expect(csv).toContain(`"'${desc}"`)
    }
  })

  it("sorts transactions newest first", () => {
    const transactions = [
      makeTransaction({ id: "1", date: "2026-01-01" }),
      makeTransaction({ id: "2", date: "2026-06-01" }),
    ]
    const csv = transactionsToCSV(transactions, categories)
    const lines = csv.split("\n")
    expect(lines[1]).toContain("Jun")
    expect(lines[2]).toContain("Jan")
  })

  it("uses Unknown for missing category", () => {
    const csv = transactionsToCSV([makeTransaction({ categoryId: "missing" })], categories)
    expect(csv).toContain('"Unknown"')
  })

  it("returns only header when no transactions", () => {
    const csv = transactionsToCSV([], categories)
    expect(csv).toBe("Date,Type,Category,Description,Amount")
  })
})

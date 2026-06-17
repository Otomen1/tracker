import { describe, it, expect, beforeEach } from "vitest"
import { exportAllData, importAllData } from "../storage"

// localStorage is provided by jsdom in the test environment

beforeEach(() => {
  localStorage.clear()
})

describe("exportAllData", () => {
  it("returns valid JSON string", () => {
    const result = exportAllData()
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it("includes schemaVersion and exportedAt fields", () => {
    const data = JSON.parse(exportAllData())
    expect(data).toHaveProperty("schemaVersion")
    expect(data).toHaveProperty("exportedAt")
  })

  it("includes transactions and categories arrays", () => {
    const data = JSON.parse(exportAllData())
    expect(Array.isArray(data.transactions)).toBe(true)
    expect(Array.isArray(data.categories)).toBe(true)
  })

  it("exports stored transactions", () => {
    const txns = [
      {
        id: "t1",
        type: "expense",
        amount: 25.5,
        categoryId: "cat_food",
        description: "Lunch",
        date: "2024-06-15",
        createdAt: "2024-06-15T12:00:00.000Z",
        updatedAt: "2024-06-15T12:00:00.000Z",
      },
    ]
    localStorage.setItem("tracker_transactions", JSON.stringify(txns))
    const data = JSON.parse(exportAllData())
    expect(data.transactions).toHaveLength(1)
    expect(data.transactions[0].description).toBe("Lunch")
  })
})

describe("importAllData", () => {
  it("returns error on invalid JSON", () => {
    const result = importAllData("not json")
    expect(result.success).toBe(false)
    expect(result.error).toContain("parse")
  })

  it("returns error on schema-invalid backup", () => {
    const result = importAllData(JSON.stringify({ transactions: "not-an-array" }))
    expect(result.success).toBe(false)
    expect(result.error).toContain("Invalid backup file")
  })

  it("returns error when transaction amount is negative", () => {
    const backup = {
      transactions: [
        {
          id: "t1",
          type: "expense",
          amount: -50,
          categoryId: "cat_food",
          description: "Bad",
          date: "2024-01-01",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    }
    const result = importAllData(JSON.stringify(backup))
    expect(result.success).toBe(false)
  })

  it("returns error when transaction date does not match YYYY-MM-DD regex", () => {
    const backup = {
      transactions: [
        {
          id: "t1",
          type: "expense",
          amount: 50,
          categoryId: "cat_food",
          description: "Bad date format",
          date: "15-06-2024",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    }
    const result = importAllData(JSON.stringify(backup))
    expect(result.success).toBe(false)
  })

  it("succeeds with valid backup and stores data", () => {
    const backup = {
      transactions: [
        {
          id: "t1",
          type: "income",
          amount: 1000,
          categoryId: "cat_salary",
          description: "Salary",
          date: "2024-06-01",
          createdAt: "2024-06-01T00:00:00.000Z",
          updatedAt: "2024-06-01T00:00:00.000Z",
        },
      ],
      categories: [
        {
          id: "cat_salary",
          name: "Salary",
          type: "income",
          color: "#22c55e",
          isDefault: true,
          createdAt: "2024-01-01T00:00:00.000Z",
        },
      ],
    }
    const result = importAllData(JSON.stringify(backup))
    expect(result.success).toBe(true)
    const stored = JSON.parse(localStorage.getItem("tracker_transactions") ?? "[]")
    expect(stored).toHaveLength(1)
    expect(stored[0].description).toBe("Salary")
  })

  it("rejects backup with more than 50000 transactions", () => {
    const backup = {
      transactions: Array.from({ length: 50001 }, (_, i) => ({
        id: `t${i}`,
        type: "expense",
        amount: 1,
        categoryId: "cat_food",
        description: "x",
        date: "2024-01-01",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      })),
    }
    const result = importAllData(JSON.stringify(backup))
    expect(result.success).toBe(false)
  })
})

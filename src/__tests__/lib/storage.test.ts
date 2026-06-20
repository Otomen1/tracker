import { describe, it, expect, beforeEach } from "vitest"
import { importAllData } from "@/lib/storage"
import { isValidHexColor } from "@/lib/utils"

beforeEach(() => {
  localStorage.clear()
})

describe("isValidHexColor", () => {
  it("accepts 3-char lowercase hex", () => expect(isValidHexColor("#abc")).toBe(true))
  it("accepts 6-char lowercase hex", () => expect(isValidHexColor("#aabbcc")).toBe(true))
  it("accepts 6-char uppercase hex", () => expect(isValidHexColor("#AABBCC")).toBe(true))
  it("accepts mixed-case hex", () => expect(isValidHexColor("#aAbBcC")).toBe(true))
  it("rejects missing hash", () => expect(isValidHexColor("red")).toBe(false))
  it("rejects invalid characters", () => expect(isValidHexColor("#gghhii")).toBe(false))
  it("rejects empty string", () => expect(isValidHexColor("")).toBe(false))
  it("rejects CSS injection attempt", () => expect(isValidHexColor("url(javascript:alert(1))")).toBe(false))
  it("rejects 4-char hex (invalid length)", () => expect(isValidHexColor("#abcd")).toBe(false))
})

const validTransaction = {
  id: "t1",
  type: "expense",
  amount: 100,
  categoryId: "cat_food",
  description: "Groceries",
  date: "2024-06-15",
  createdAt: "2024-06-15T10:00:00Z",
  updatedAt: "2024-06-15T10:00:00Z",
}

const validCategory = {
  id: "cat_food",
  name: "Food",
  type: "expense",
  color: "#f97316",
  isDefault: true,
  createdAt: "2024-01-01T00:00:00Z",
}

describe("importAllData", () => {
  it("returns success for a valid backup", () => {
    const json = JSON.stringify({ transactions: [validTransaction], categories: [validCategory] })
    expect(importAllData(json).success).toBe(true)
  })

  it("returns error for invalid JSON", () => {
    const result = importAllData("not json {{")
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })

  it("returns error when transactions key is missing", () => {
    const result = importAllData(JSON.stringify({ categories: [] }))
    expect(result.success).toBe(false)
    expect(result.error).toContain("missing transactions")
  })

  it("filters out malformed transactions (missing type)", () => {
    const bad = { ...validTransaction, type: undefined }
    const json = JSON.stringify({ transactions: [bad, validTransaction] })
    importAllData(json)
    const saved = JSON.parse(localStorage.getItem("tracker_transactions") ?? "[]")
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe("t1")
  })

  it("filters out malformed transactions (missing amount)", () => {
    const bad = { ...validTransaction, id: "t-bad", amount: "not-a-number" }
    const json = JSON.stringify({ transactions: [bad, validTransaction] })
    importAllData(json)
    const saved = JSON.parse(localStorage.getItem("tracker_transactions") ?? "[]")
    expect(saved).toHaveLength(1)
  })

  it("filters out malformed categories (missing id)", () => {
    const bad = { ...validCategory, id: undefined }
    const json = JSON.stringify({ transactions: [validTransaction], categories: [bad, validCategory] })
    importAllData(json)
    const saved = JSON.parse(localStorage.getItem("tracker_categories") ?? "[]")
    expect(saved).toHaveLength(1)
    expect(saved[0].id).toBe("cat_food")
  })

  it("replaces invalid hex color with fallback #6b7280", () => {
    const badColor = { ...validCategory, color: "notahex" }
    const json = JSON.stringify({ transactions: [validTransaction], categories: [badColor] })
    importAllData(json)
    const saved = JSON.parse(localStorage.getItem("tracker_categories") ?? "[]")
    expect(saved[0].color).toBe("#6b7280")
  })

  it("succeeds when categories key is absent", () => {
    const json = JSON.stringify({ transactions: [validTransaction] })
    expect(importAllData(json).success).toBe(true)
  })

  it("saves transactions to localStorage on success", () => {
    const json = JSON.stringify({ transactions: [validTransaction] })
    importAllData(json)
    const saved = JSON.parse(localStorage.getItem("tracker_transactions") ?? "null")
    expect(saved).not.toBeNull()
    expect(saved[0].id).toBe("t1")
  })
})

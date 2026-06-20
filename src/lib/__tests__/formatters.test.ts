import { describe, it, expect, vi, afterEach } from "vitest"
import { formatCurrency, formatDate, addMonths, getMonthKey, getYearKey, formatShortMonth } from "../formatters"

describe("formatCurrency", () => {
  it("formats USD correctly", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56")
  })

  it("formats EUR correctly", () => {
    expect(formatCurrency(99.5, "EUR")).toBe("€99.50")
  })

  it("defaults to USD for missing currency", () => {
    expect(formatCurrency(50)).toBe("$50.00")
  })

  it("returns a string for any input without throwing", () => {
    expect(() => formatCurrency(100, "XYZ")).not.toThrow()
    expect(typeof formatCurrency(100, "XYZ")).toBe("string")
  })
})

describe("formatDate", () => {
  it("formats ISO date string", () => {
    expect(formatDate("2024-03-15")).toBe("Mar 15, 2024")
  })

  it("returns original string on invalid input", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date")
  })
})

describe("addMonths", () => {
  it("adds months correctly", () => {
    expect(addMonths("2024-01", 1)).toBe("2024-02")
  })

  it("handles year rollover", () => {
    expect(addMonths("2024-12", 1)).toBe("2025-01")
  })

  it("subtracts months correctly", () => {
    expect(addMonths("2024-03", -2)).toBe("2024-01")
  })

  it("handles negative year rollover", () => {
    expect(addMonths("2024-01", -1)).toBe("2023-12")
  })

  it("does not mutate intermediate dates (pure function)", () => {
    const before = addMonths("2024-01", 1)
    const after = addMonths("2024-01", 1)
    expect(before).toBe(after)
  })
})

describe("getMonthKey", () => {
  it("returns current month key in YYYY-MM format", () => {
    expect(getMonthKey()).toMatch(/^\d{4}-\d{2}$/)
  })

  it("accepts a date parameter", () => {
    expect(getMonthKey(new Date("2024-06-15"))).toBe("2024-06")
  })
})

describe("getYearKey", () => {
  it("returns current year", () => {
    expect(getYearKey()).toBe(new Date().getFullYear())
  })

  it("accepts a date parameter", () => {
    expect(getYearKey(new Date("2023-01-01"))).toBe(2023)
  })
})

describe("formatShortMonth", () => {
  it("formats month key to short form", () => {
    expect(formatShortMonth("2024-01")).toBe("Jan 24")
  })

  it("returns original string on invalid input", () => {
    expect(formatShortMonth("invalid")).toBe("invalid")
  })
})

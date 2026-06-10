import { describe, it, expect } from "vitest"
import {
  formatCurrency,
  formatDate,
  formatMonth,
  formatShortMonth,
  getMonthKey,
  addMonths,
} from "@/lib/formatters"

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56")
  })
  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00")
  })
  it("formats EUR with correct symbol", () => {
    const result = formatCurrency(100, "EUR")
    expect(result).toContain("100")
    expect(result).toContain("€")
  })
  it("falls back to USD for unknown currency code", () => {
    expect(formatCurrency(50, "INVALID")).toBe("$50.00")
  })
})

describe("formatDate", () => {
  it("formats a valid ISO date", () => {
    expect(formatDate("2024-01-15")).toBe("Jan 15, 2024")
  })
  it("returns original string on invalid input", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date")
  })
})

describe("formatMonth", () => {
  it("formats YYYY-MM to full month and year", () => {
    expect(formatMonth("2024-01")).toBe("January 2024")
    expect(formatMonth("2024-12")).toBe("December 2024")
  })
  it("returns original string on invalid input", () => {
    expect(formatMonth("invalid")).toBe("invalid")
  })
})

describe("formatShortMonth", () => {
  it("formats to abbreviated month and 2-digit year", () => {
    expect(formatShortMonth("2024-01")).toBe("Jan 24")
  })
})

describe("getMonthKey", () => {
  it("returns a string matching YYYY-MM format", () => {
    expect(getMonthKey()).toMatch(/^\d{4}-\d{2}$/)
  })
  it("returns correct key for a given date", () => {
    expect(getMonthKey(new Date(2024, 5, 15))).toBe("2024-06")
  })
})

describe("addMonths", () => {
  it("advances by positive delta", () => {
    expect(addMonths("2024-01", 1)).toBe("2024-02")
    expect(addMonths("2024-01", 11)).toBe("2024-12")
  })
  it("wraps forward to next year", () => {
    expect(addMonths("2024-12", 1)).toBe("2025-01")
  })
  it("goes back with negative delta", () => {
    expect(addMonths("2024-03", -2)).toBe("2024-01")
  })
  it("wraps back to previous year", () => {
    expect(addMonths("2024-01", -1)).toBe("2023-12")
  })
})

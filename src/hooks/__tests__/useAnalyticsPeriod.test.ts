import { describe, it, expect } from "vitest"
import { parseAnalyticsPeriod, serializeAnalyticsPeriod } from "../useAnalyticsPeriod"

describe("parseAnalyticsPeriod", () => {
  it("defaults to month view with no params", () => {
    const period = parseAnalyticsPeriod(new URLSearchParams(""), 2026)
    expect(period.type).toBe("month")
    expect(period.year).toBe(2026)
  })

  it("parses an explicit month param", () => {
    const period = parseAnalyticsPeriod(new URLSearchParams("view=month&month=2024-03"), 2026)
    expect(period).toEqual({ type: "month", month: "2024-03", year: 2026 })
  })

  it("falls back to the current month when the month param is malformed", () => {
    const period = parseAnalyticsPeriod(new URLSearchParams("view=month&month=not-a-month"), 2026)
    expect(period.type).toBe("month")
    expect(period.month).toMatch(/^\d{4}-\d{2}$/)
  })

  it("parses an explicit year param", () => {
    const period = parseAnalyticsPeriod(new URLSearchParams("view=year&year=2024"), 2026)
    expect(period).toEqual({ type: "year", month: expect.any(String), year: 2024 })
  })

  it("clamps a future year param to the current year", () => {
    const period = parseAnalyticsPeriod(new URLSearchParams("view=year&year=2099"), 2026)
    expect(period.year).toBe(2026)
  })

  it("falls back to the current year when the year param is malformed", () => {
    const period = parseAnalyticsPeriod(new URLSearchParams("view=year&year=abc"), 2026)
    expect(period.year).toBe(2026)
  })
})

describe("serializeAnalyticsPeriod", () => {
  it("serializes a month period and omits year", () => {
    const query = serializeAnalyticsPeriod({ type: "month", month: "2024-03", year: 2026 }, new URLSearchParams(""))
    const params = new URLSearchParams(query)
    expect(params.get("view")).toBe("month")
    expect(params.get("month")).toBe("2024-03")
    expect(params.has("year")).toBe(false)
  })

  it("serializes a year period and omits month", () => {
    const query = serializeAnalyticsPeriod({ type: "year", month: "2024-03", year: 2024 }, new URLSearchParams(""))
    const params = new URLSearchParams(query)
    expect(params.get("view")).toBe("year")
    expect(params.get("year")).toBe("2024")
    expect(params.has("month")).toBe(false)
  })

  it("preserves unrelated existing params", () => {
    const query = serializeAnalyticsPeriod(
      { type: "month", month: "2024-03", year: 2026 },
      new URLSearchParams("foo=bar")
    )
    const params = new URLSearchParams(query)
    expect(params.get("foo")).toBe("bar")
  })
})

import { describe, it, expect } from "vitest"
import { getMonthlyRedirectTarget, getAnnualRedirectTarget } from "../legacyRedirects"

describe("getMonthlyRedirectTarget", () => {
  it("preserves a valid month param", () => {
    expect(getMonthlyRedirectTarget("2026-07")).toBe("/analytics?view=month&month=2026-07")
  })

  it("falls back to bare /analytics when no param is given", () => {
    expect(getMonthlyRedirectTarget(undefined)).toBe("/analytics")
  })

  it("falls back safely on a malformed month", () => {
    expect(getMonthlyRedirectTarget("not-a-month")).toBe("/analytics")
    expect(getMonthlyRedirectTarget("")).toBe("/analytics")
    expect(getMonthlyRedirectTarget("2026")).toBe("/analytics")
  })

  it("does not create a redirect loop (never targets /monthly)", () => {
    expect(getMonthlyRedirectTarget("2026-07")).not.toContain("/monthly")
    expect(getMonthlyRedirectTarget(undefined)).not.toContain("/monthly")
  })
})

describe("getAnnualRedirectTarget", () => {
  it("preserves a valid year param", () => {
    expect(getAnnualRedirectTarget("2026")).toBe("/analytics?view=year&year=2026")
  })

  it("falls back to bare /analytics when no param is given", () => {
    expect(getAnnualRedirectTarget(undefined)).toBe("/analytics")
  })

  it("falls back safely on a malformed year", () => {
    expect(getAnnualRedirectTarget("not-a-year")).toBe("/analytics")
    expect(getAnnualRedirectTarget("")).toBe("/analytics")
    expect(getAnnualRedirectTarget("2026-07")).toBe("/analytics")
  })

  it("does not create a redirect loop (never targets /annual)", () => {
    expect(getAnnualRedirectTarget("2026")).not.toContain("/annual")
    expect(getAnnualRedirectTarget(undefined)).not.toContain("/annual")
  })
})

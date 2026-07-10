import { describe, it, expect } from "vitest"
import { shouldAutoFillDescription } from "../descriptionDefault"

describe("shouldAutoFillDescription", () => {
  it("auto-fills when the description is empty (new transaction, no category chosen yet)", () => {
    expect(shouldAutoFillDescription("", null)).toBe(true)
    expect(shouldAutoFillDescription("", "Food")).toBe(true)
  })

  it("auto-fills when the description still matches the last auto-filled value (category changed again before any manual edit)", () => {
    expect(shouldAutoFillDescription("Food", "Food")).toBe(true)
  })

  it("does not auto-fill once the user has typed something different (manual override)", () => {
    expect(shouldAutoFillDescription("Groceries at Walmart", "Food")).toBe(false)
  })

  it("does not auto-fill a loaded existing-transaction description, even if lastAuto is null", () => {
    // Edit mode starts with lastAuto = null and a non-empty saved description -
    // it must never match, so the saved value is never touched by category changes.
    expect(shouldAutoFillDescription("Weekly groceries", null)).toBe(false)
  })

  it("becomes eligible again once a manual description is cleared back to empty", () => {
    // Regardless of prior lastAuto history, clearing to "" always re-qualifies.
    expect(shouldAutoFillDescription("", "Food")).toBe(true)
  })
})

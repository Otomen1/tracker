import { describe, it, expect } from "vitest"
import { buildTransactionsDeepLink, parseTransactionsDeepLink } from "../deepLinks"
import { Category } from "@/types"

const makeCategory = (overrides: Partial<Category> = {}): Category => ({
  id: "cat1",
  name: "Food",
  type: "expense",
  color: "#f00",
  isDefault: false,
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
})

describe("buildTransactionsDeepLink", () => {
  it("builds a URL with all supported filters", () => {
    const url = buildTransactionsDeepLink({ categoryId: "cat1", dateFrom: "2026-07-01", dateTo: "2026-07-31", type: "expense" })
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("categoryId")).toBe("cat1")
    expect(params.get("dateFrom")).toBe("2026-07-01")
    expect(params.get("dateTo")).toBe("2026-07-31")
    expect(params.get("type")).toBe("expense")
  })

  it("omits empty filters instead of including blank params", () => {
    const url = buildTransactionsDeepLink({ type: "income" })
    expect(url).toBe("/transactions?type=income")
  })

  it("returns the bare path when no filters are provided", () => {
    expect(buildTransactionsDeepLink({})).toBe("/transactions")
  })

  it("safely encodes category ids containing special characters", () => {
    const url = buildTransactionsDeepLink({ categoryId: "cat with spaces & stuff" })
    expect(url).not.toContain(" ")
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("categoryId")).toBe("cat with spaces & stuff")
  })
})

describe("parseTransactionsDeepLink", () => {
  const categories = [
    makeCategory({ id: "cat1", name: "Food" }),
    makeCategory({ id: "cat2", name: "Home Improvement & Renovation, Supplies (misc.)" }),
  ]

  it("applies all valid supported params", () => {
    const params = new URLSearchParams("categoryId=cat1&dateFrom=2026-07-01&dateTo=2026-07-31&type=expense")
    const filters = parseTransactionsDeepLink(params, categories)
    expect(filters).toEqual({
      categoryId: "cat1",
      type: "expense",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    })
  })

  it("applies a category whose name contains spaces and special characters", () => {
    const params = new URLSearchParams("categoryId=cat2")
    const filters = parseTransactionsDeepLink(params, categories)
    expect(filters.categoryId).toBe("cat2")
  })

  it("drops a categoryId that does not match any loaded category", () => {
    const params = new URLSearchParams("categoryId=does-not-exist")
    const filters = parseTransactionsDeepLink(params, categories)
    expect(filters.categoryId).toBeUndefined()
  })

  it("drops an invalid type value", () => {
    const params = new URLSearchParams("type=refund")
    const filters = parseTransactionsDeepLink(params, categories)
    expect(filters.type).toBeUndefined()
  })

  it("drops malformed dates", () => {
    const params = new URLSearchParams("dateFrom=07/01/2026&dateTo=not-a-date")
    const filters = parseTransactionsDeepLink(params, categories)
    expect(filters.dateFrom).toBeUndefined()
    expect(filters.dateTo).toBeUndefined()
  })

  it("ignores unsupported/unknown query params entirely", () => {
    const params = new URLSearchParams("categoryId=cat1&search=hack&minAmount=-1&admin=true")
    const filters = parseTransactionsDeepLink(params, categories)
    expect(filters).toEqual({ categoryId: "cat1" })
  })

  it("returns an empty filter object when no params are present", () => {
    const filters = parseTransactionsDeepLink(new URLSearchParams(""), categories)
    expect(filters).toEqual({})
  })
})

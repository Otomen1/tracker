import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CategoriesProvider, useCategoriesContext } from "@/context/CategoriesContext"
import { STORAGE_KEYS } from "@/lib/constants"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CategoriesProvider>{children}</CategoriesProvider>
)

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("CategoriesProvider", () => {
  it("shares mutations with every consumer and persists them", () => {
    const first = renderHook(() => useCategoriesContext(), { wrapper })
    const second = renderHook(() => useCategoriesContext(), { wrapper })

    // Separate provider trees still synchronize through the same-tab event,
    // which also protects consumers mounted outside a shared route subtree.
    act(() => {
      first.result.current.addCategory({ name: "Travel", type: "expense", color: "#123456" })
    })

    expect(second.result.current.categories.some((category) => category.name === "Travel")).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) ?? "[]")).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Travel" })])
    )
  })

  it("keeps the current state and reports failure when storage rejects a write", () => {
    const { result } = renderHook(() => useCategoriesContext(), { wrapper })
    const before = result.current.categories
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError")
    })

    let created: ReturnType<typeof result.current.addCategory>
    act(() => {
      created = result.current.addCategory({ name: "Travel", type: "expense", color: "#123456" })
    })

    expect(created!).toBeNull()
    expect(result.current.categories).toEqual(before)
  })
})

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { CategoriesProvider, useCategoriesContext } from "@/context/CategoriesContext"
import { VaultProvider } from "@/context/VaultContext"
import { STORAGE_KEYS } from "@/lib/constants"

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <VaultProvider><CategoriesProvider>{children}</CategoriesProvider></VaultProvider>
)

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("CategoriesProvider", () => {
  it("shares mutations with every consumer and persists them", async () => {
    const first = renderHook(() => useCategoriesContext(), { wrapper })
    const second = renderHook(() => useCategoriesContext(), { wrapper })

    // Separate provider trees still synchronize through the same-tab event,
    // which also protects consumers mounted outside a shared route subtree.
    await act(async () => {
      await first.result.current.addCategory({ name: "Travel", type: "expense", color: "#123456" })
    })

    expect(second.result.current.categories.some((category) => category.name === "Travel")).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) ?? "[]")).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Travel" })])
    )
  })

  it("keeps the current state and reports failure when storage rejects a write", async () => {
    const { result } = renderHook(() => useCategoriesContext(), { wrapper })
    const before = result.current.categories
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError")
    })

    let created: Awaited<ReturnType<typeof result.current.addCategory>>
    await act(async () => {
      created = await result.current.addCategory({ name: "Travel", type: "expense", color: "#123456" })
    })

    expect(created!).toBeNull()
    expect(result.current.categories).toEqual(before)
  })
})

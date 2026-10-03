import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewInboxProvider, useReviewInbox } from "@/context/ReviewInboxContext"
import { nativeCapture } from "@/lib/nativeCapture"
import type { PendingTransaction } from "@/types"

let unlocked = true
vi.mock("@/context/VaultContext", () => ({ useVault: () => ({ unlocked }) }))
vi.mock("@/lib/nativeCapture", () => ({ nativeCapture: { listPending: vi.fn(), discardPending: vi.fn() } }))
const item: PendingTransaction = { id: "p", provider: "ryt", fingerprint: "fingerprint-123456", direction: "expense", amount: 9, description: "Paid", accountId: "bank", occurredAt: "2026-09-30T00:00:00Z", capturedAt: "2026-09-30T00:00:00Z" }
const wrapper = ({ children }: { children: React.ReactNode }) => <ReviewInboxProvider>{children}</ReviewInboxProvider>
beforeEach(() => { unlocked = true; vi.resetAllMocks() })

describe("secure inbox lifecycle", () => {
  it("keeps the last list and surfaces a bridge rejection on refresh", async () => {
    vi.mocked(nativeCapture.listPending).mockResolvedValueOnce({ items: [item] }).mockRejectedValueOnce(new Error("Bridge failed"))
    const hook = renderHook(() => useReviewInbox(), { wrapper })
    await waitFor(() => expect(hook.result.current.items).toEqual([item]))
    await act(async () => { await hook.result.current.refresh() })
    expect(hook.result.current.items).toEqual([item])
    expect(hook.result.current.error).toBe("Bridge failed")
    expect(hook.result.current.loading).toBe(false)
  })
  it("does not republish sensitive items from a delayed response after locking", async () => {
    let complete!: (value: { items: PendingTransaction[] }) => void
    vi.mocked(nativeCapture.listPending).mockReturnValue(new Promise(resolve => { complete = resolve }))
    const hook = renderHook(() => useReviewInbox(), { wrapper })
    unlocked = false; hook.rerender()
    await act(async () => { complete({ items: [item] }) })
    expect(hook.result.current.items).toEqual([])
    expect(hook.result.current.loading).toBe(false)
  })
  it("keeps the item when native cleanup fails", async () => {
    vi.mocked(nativeCapture.listPending).mockResolvedValue({ items: [item] })
    vi.mocked(nativeCapture.discardPending).mockRejectedValue(new Error("Write failed"))
    const hook = renderHook(() => useReviewInbox(), { wrapper })
    await waitFor(() => expect(hook.result.current.items).toEqual([item]))
    await act(async () => { await expect(hook.result.current.resolve(item.id)).rejects.toThrow("Write failed") })
    expect(hook.result.current.items).toEqual([item])
  })
})

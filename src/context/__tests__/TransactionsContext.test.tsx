import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { TransactionsProvider } from "@/context/TransactionsContext"
import { useTransactions } from "@/hooks/useTransactions"
import { STORAGE_KEYS } from "@/lib/constants"
import { Transaction } from "@/types"

const transaction: Transaction = {
  id: "txn-1",
  type: "expense",
  amount: 12,
  categoryId: "cat_food",
  description: "Lunch",
  date: "2026-09-06",
  createdAt: "2026-09-06T00:00:00.000Z",
  updatedAt: "2026-09-06T00:00:00.000Z",
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TransactionsProvider>{children}</TransactionsProvider>
)

describe("TransactionsProvider persistence", () => {
  beforeEach(() => localStorage.clear())

  it("keeps a deletion after focus and remount", () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([transaction]))
    const first = renderHook(() => useTransactions(), { wrapper })

    act(() => {
      expect(first.result.current.deleteTransaction(transaction.id)).toBe(true)
      window.dispatchEvent(new Event("focus"))
    })

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) ?? "null")).toEqual([])
    first.unmount()

    const second = renderHook(() => useTransactions(), { wrapper })
    expect(second.result.current.transactions).toEqual([])
  })

  it("does not write when recurring generation has no work", () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([transaction]))
    const setItem = vi.spyOn(Storage.prototype, "setItem")
    renderHook(() => useTransactions(), { wrapper })
    expect(setItem).not.toHaveBeenCalled()
    setItem.mockRestore()
  })

  it("confirms a captured transaction once and rejects a replay as duplicate", () => {
    const hook = renderHook(() => useTransactions(), { wrapper })
    const pending = { id: "pending-1", provider: "ryt" as const, fingerprint: "fingerprint-123456", direction: "expense" as const, amount: 0.01, description: "Transfer to Test", occurredAt: "2026-09-21T20:28:00+08:00", capturedAt: "2026-09-21T20:28:01+08:00", accountId: "account_ryt" }
    act(() => {
      expect(hook.result.current.confirmCaptured(pending, { type: "expense", amount: 0.01, categoryId: "cat_expense_other", description: pending.description, date: "2026-09-21", accountId: "account_ryt" })).toBe("added")
    })
    act(() => {
      expect(hook.result.current.confirmCaptured(pending, { type: "expense", amount: 0.01, categoryId: "cat_expense_other", description: pending.description, date: "2026-09-21", accountId: "account_ryt" })).toBe("duplicate")
    })
    expect(hook.result.current.transactions).toHaveLength(1)
  })

  it("stores an internal transfer without categorizing it as spending", () => {
    const hook = renderHook(() => useTransactions(), { wrapper })
    const pending = { id: "pending-2", provider: "mae" as const, fingerprint: "fingerprint-654321", direction: "expense" as const, amount: 20, description: "Own transfer", occurredAt: "2026-09-21T20:28:00+08:00", capturedAt: "2026-09-21T20:28:01+08:00", accountId: "account_maybank" }
    act(() => { expect(hook.result.current.confirmTransfer(pending, "account_maybank", "account_ryt", pending.description, "2026-09-21")).toBe("added") })
    expect(hook.result.current.transactions[0]).toMatchObject({ type: "transfer", fromAccountId: "account_maybank", toAccountId: "account_ryt", categoryId: "" })
  })
})

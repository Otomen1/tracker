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
})

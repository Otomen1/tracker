import { beforeEach, describe, expect, it, vi } from "vitest"
import { DEFAULT_SETTINGS, STORAGE_KEYS } from "@/lib/constants"
import { readSyncState, scanLocalChanges, writeSyncState } from "@/lib/sync/client"

const transaction = {
  id: "transaction-1",
  type: "expense",
  amount: 12.5,
  categoryId: "cat_food",
  description: "Lunch",
  date: "2026-09-28",
  createdAt: "2026-09-28T01:00:00.000Z",
  updatedAt: "2026-09-28T01:00:00.000Z",
}

describe("local sync queue", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000001") })
  })

  it("queues existing data without changing the application storage", () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([transaction]))
    const before = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
    const state = scanLocalChanges(readSyncState(), "2026-09-28T02:00:00.000Z")

    expect(state.queue.some((item) => item.entity === "transactions" && item.recordId === transaction.id)).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)).toBe(before)
  })

  it("coalesces repeated edits to the same record", () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([transaction]))
    let state = scanLocalChanges(readSyncState(), "2026-09-28T02:00:00.000Z")
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([{ ...transaction, amount: 18 }]))
    state = scanLocalChanges(state, "2026-09-28T03:00:00.000Z")

    const operations = state.queue.filter((item) => item.entity === "transactions" && item.recordId === transaction.id)
    expect(operations).toHaveLength(1)
    expect(operations[0]?.data?.amount).toBe(18)
  })

  it("retains a tombstone when a local record is deleted", () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([transaction]))
    let state = scanLocalChanges(readSyncState(), "2026-09-28T02:00:00.000Z")
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, "[]")
    state = scanLocalChanges(state, "2026-09-28T03:00:00.000Z")

    expect(state.queue.find((item) => item.recordId === transaction.id)).toMatchObject({ deleted: true, data: null })
    expect(state.records.transactions[transaction.id]?.deleted).toBe(true)
  })

  it("persists sync metadata separately from financial data", () => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS))
    const state = scanLocalChanges(readSyncState(), "2026-09-28T02:00:00.000Z")
    writeSyncState(state)

    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) ?? "null")).toEqual(DEFAULT_SETTINGS)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_STATE) ?? "null").deviceId).toBeTruthy()
  })
})

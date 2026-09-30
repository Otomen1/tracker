import { beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_CATEGORIES, STORAGE_KEYS } from "@/lib/constants"
import {
  emptyVault,
  hasWebRecovery,
  readLegacyVault,
  restoreWebRecovery,
  validateVault,
  writeWebVault,
} from "@/lib/vault/schema"

const transaction = {
  id: "txn-1",
  type: "expense" as const,
  amount: 12.5,
  categoryId: "cat_food",
  description: "Lunch",
  date: "2026-09-29",
  createdAt: "2026-09-29T04:00:00.000Z",
  updatedAt: "2026-09-29T04:00:00.000Z",
}

beforeEach(() => localStorage.clear())

describe("vault schema and migration", () => {
  it("reads all legacy records without changing the source storage", () => {
    const original = JSON.stringify([transaction])
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, original)
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES))
    localStorage.setItem(STORAGE_KEYS.ANDROID_SETUP, "1")

    const migrated = readLegacyVault(localStorage)

    expect(migrated.transactions).toEqual([transaction])
    expect(migrated.androidSetupComplete).toBe(true)
    expect(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)).toBe(original)
  })

  it("rejects duplicate record IDs before a vault is written", () => {
    const candidate = emptyVault()
    candidate.transactions = [transaction, { ...transaction }]
    expect(() => validateVault(candidate)).toThrow("Duplicate transaction ID")
  })

  it("rolls browser storage back when a multi-key write is interrupted", () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([transaction]))
    const next = emptyVault()
    next.transactions = [{ ...transaction, id: "txn-2", description: "Dinner" }]
    let failed = false
    const interrupted = {
      getItem: localStorage.getItem.bind(localStorage),
      removeItem: localStorage.removeItem.bind(localStorage),
      setItem(key: string, value: string) {
        if (key === STORAGE_KEYS.SETTINGS && !failed) {
          failed = true
          throw new DOMException("interrupted", "QuotaExceededError")
        }
        localStorage.setItem(key, value)
      },
    }

    expect(() => writeWebVault(interrupted, next)).toThrow("interrupted")
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) ?? "[]")).toEqual([transaction])
    expect(hasWebRecovery(localStorage)).toBe(false)
  })

  it("restores and validates a retained browser recovery snapshot", () => {
    const previous = emptyVault()
    previous.transactions = [transaction]
    writeWebVault(localStorage, previous)
    const values = Object.fromEntries([
      STORAGE_KEYS.TRANSACTIONS,
      STORAGE_KEYS.CATEGORIES,
      STORAGE_KEYS.ACCOUNTS,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.ANDROID_SETUP,
      STORAGE_KEYS.SCHEMA_VERSION,
    ].map((key) => [key, localStorage.getItem(key)]))
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, "[]")
    localStorage.setItem(STORAGE_KEYS.RECOVERY, JSON.stringify({ capturedAt: new Date().toISOString(), values }))

    const restored = restoreWebRecovery(localStorage)

    expect(restored.transactions).toEqual([transaction])
    expect(hasWebRecovery(localStorage)).toBe(false)
  })
})

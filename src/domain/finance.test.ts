import { describe, expect, it } from "vitest"
import { accountActivity, parseMoney, transferEndpoints, validateEntry, hasFingerprint } from "./finance"
import { getDashboardStats, getBudgetStatus, getAnnualSummary, getCumulativeBalance } from "@/lib/analytics"
import { emptyVault, validateVault, readLegacyVault } from "@/lib/vault/schema"
import { parseBackupJson, createBackupJson } from "@/lib/storage"
import { DEFAULT_CATEGORIES, STORAGE_KEYS } from "@/lib/constants"
import type { Account, Transaction, PendingTransaction } from "@/types"

const bank: Account = { id: "bank", name: "Bank", currency: "MYR", openingBalance: 1000, isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
const card: Account = { ...bank, id: "card", name: "Card", kind: "credit_card", openingBalance: 100, creditLimit: 1000 }
const base = { categoryId: "cat_food", description: "Purchase", date: "2026-10-03", createdAt: bank.createdAt, updatedAt: bank.updatedAt }
const purchase: Transaction = { ...base, id: "purchase", type: "expense", amount: 50, accountId: card.id }
const repayment: Transaction = { ...base, id: "payment", type: "transfer", categoryId: "", amount: 40, fromAccountId: bank.id, toAccountId: card.id }
const pending: PendingTransaction = { id: "p", provider: "ryt", fingerprint: "fingerprint-123456", direction: "income", amount: 100, accountId: bank.id, description: "Received", occurredAt: bank.createdAt, capturedAt: bank.createdAt }

describe("finance rules and upgrade preservation", () => {
  it("separates purchase spending from repayment cash movement", () => {
    expect(accountActivity(card.id, [purchase, repayment])).toEqual({ incoming: 40, outgoing: 50, count: 2 })
    expect(accountActivity(bank.id, [purchase, repayment])).toEqual({ incoming: 0, outgoing: 40, count: 1 })
    const stats = getDashboardStats([purchase, repayment], "2026-10")
    expect(stats.currentMonthExpenses).toBe(50)
    expect(stats.currentMonthIncome).toBe(0)
  })
  it("reports recorded source movements independently of legacy financial metadata", () => {
    expect(accountActivity(card.id, [{ ...repayment, amount: 140 }])).toEqual({ incoming: 140, outgoing: 0, count: 1 })
  })
  it("refunds reverse spending without inflating income across analytics", () => {
    const refund: Transaction = { ...purchase, id: "refund", type: "income", amount: 20, isRefund: true }
    const entries = [purchase, repayment, refund]
    expect(accountActivity(card.id, entries)).toEqual({ incoming: 60, outgoing: 50, count: 3 })
    expect(getDashboardStats(entries, "2026-10")).toMatchObject({ currentMonthIncome: 0, currentMonthExpenses: 30 })
    expect(getAnnualSummary(entries, 2026, DEFAULT_CATEGORIES).totalExpenses).toBe(30)
    expect(getCumulativeBalance(entries, "2026-10").at(-1)?.balance).toBe(-30)
    expect(getBudgetStatus(entries, "2026-10", DEFAULT_CATEGORIES.map(c => c.id === "cat_food" ? { ...c, budget: 100 } : c)).find(c => c.categoryId === "cat_food")?.spent).toBe(30)
    expect(() => validateEntry(refund, [bank, card], DEFAULT_CATEGORIES)).not.toThrow()
  })
  it("assigns a received notification to the transfer destination", () => {
    expect(transferEndpoints(pending, "card")).toEqual({ fromAccountId: "card", toAccountId: "bank" })
    expect(transferEndpoints({ ...pending, direction: "expense" }, "card")).toEqual({ fromAccountId: "bank", toAccountId: "card" })
  })
  it("rejects same, missing, inactive and cross-currency endpoints", () => {
    for (const other of [{ ...card, id: bank.id }, { ...card, isActive: false }, { ...card, currency: "USD" }]) {
      expect(() => validateEntry(repayment, [bank, other], DEFAULT_CATEGORIES)).toThrow()
    }
    expect(() => validateEntry({ ...repayment, toAccountId: "missing" }, [bank, card], DEFAULT_CATEGORIES)).toThrow()
  })
  it("allows corrections to archived history while rejecting new entries there", () => {
    const archived = { ...card, isActive: false }
    expect(() => validateEntry(purchase, [bank, archived], DEFAULT_CATEGORIES, purchase)).not.toThrow()
    expect(() => validateEntry(purchase, [bank, archived], DEFAULT_CATEGORIES)).toThrow()
  })
  it("requires an appropriate category and card refund destination", () => {
    expect(() => validateEntry({ ...purchase, categoryId: "cat_salary" }, [bank, card], DEFAULT_CATEGORIES)).toThrow()
    expect(() => validateEntry({ ...purchase, type: "income", isRefund: true, accountId: bank.id }, [bank, card], DEFAULT_CATEGORIES)).toThrow()
  })
  it("accepts exact new money inputs and rejects partial parsing", () => {
    expect(parseMoney("0.01")).toBe(0.01)
    for (const value of ["12junk", "Infinity", "1.234", "1e3", ""]) expect(() => parseMoney(value)).toThrow()
  })
  it("migrates v3 without changing historical IDs, amounts or source metadata", () => {
    const legacy = { ...emptyVault(), schemaVersion: 3, accounts: [bank], transactions: [{ ...purchase, amount: 12.345, accountId: bank.id }] }
    const source = JSON.stringify(legacy)
    const upgraded = validateVault(legacy)
    expect(upgraded.schemaVersion).toBe(4)
    expect(upgraded.transactions).toEqual(legacy.transactions)
    expect(upgraded.accounts).toEqual(legacy.accounts)
    expect(JSON.stringify(legacy)).toBe(source)
    expect(parseBackupJson(createBackupJson(upgraded))).toMatchObject({ success: true, vault: { schemaVersion: 4, accounts: upgraded.accounts, transactions: upgraded.transactions } })
  })
  it("rejects unsupported newer vaults and backups without replacing data", () => {
    expect(() => validateVault({ ...emptyVault(), schemaVersion: 5 })).toThrow()
    expect(parseBackupJson(JSON.stringify({ ...emptyVault(), schemaVersion: 5 }))).toMatchObject({ success: false })
    const storage = { getItem: (key: string) => key === STORAGE_KEYS.SCHEMA_VERSION ? "5" : null }
    expect(() => readLegacyVault(storage)).toThrow("Unsupported newer")
  })
  it("recognizes all explicitly linked notification identities", () => {
    expect(hasFingerprint({ ...repayment, linkedNotifications: [{ provider: "ryt", fingerprint: pending.fingerprint, capturedAt: pending.capturedAt }] }, pending.fingerprint)).toBe(true)
  })
})

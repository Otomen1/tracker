import { expect, it } from "vitest"
import { filterTransactions } from "../analytics"
import { transactionsToCSV } from "../csv"
import { buildTransactionsDeepLink, parseTransactionsDeepLink } from "../deepLinks"
import type { Account, Transaction } from "@/types"
const base = { categoryId: "", description: "Transfer", date: "2026-10-01", createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" }
const entries: Transaction[] = [{ ...base, id: "transfer", type: "transfer", amount: 20, fromAccountId: "ryt", toAccountId: "mae" }, { ...base, id: "cash", type: "expense", amount: 5, accountId: "cash" }]
it("source filters find both endpoints of a transfer without duplicating the record", () => {
  expect(filterTransactions(entries, { accountId: "ryt" })).toEqual([entries[0]])
  expect(filterTransactions(entries, { accountId: "mae" })).toEqual([entries[0]])
  expect(filterTransactions(entries, { accountId: "cash" })).toEqual([entries[1]])
})
it("source deep links preserve filtering", () => {
  const url = buildTransactionsDeepLink({ accountId: "my bank", dateFrom: "2026-10-01" })
  expect(parseTransactionsDeepLink(new URL(url, "https://tracker.test").searchParams, [])).toMatchObject({ accountId: "my bank", dateFrom: "2026-10-01" })
})
it("CSV exports identify source and transfer endpoints with formula-safe labels", () => {
  const accounts = [{ id: "ryt", name: "Ryt" }, { id: "mae", name: "=PRIVATE" }] as Account[]
  const csv = transactionsToCSV([entries[0]], [], accounts)
  expect(csv).toContain("Amount,Source,From,To")
  expect(csv).toContain('"Ryt","\'=PRIVATE"')
})

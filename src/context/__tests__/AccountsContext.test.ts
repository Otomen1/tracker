import { describe, expect, it } from "vitest"
import { accountActivity } from "@/domain/finance"
import { Transaction } from "@/types"
const base = { categoryId: "cat_expense_other", description: "Test", date: "2026-09-21", createdAt: "2026-09-21T00:00:00.000Z", updatedAt: "2026-09-21T00:00:00.000Z" }
const transactions: Transaction[] = [
  { ...base, id: "in", type: "income", amount: 50, accountId: "ryt" },
  { ...base, id: "out", type: "expense", amount: 10, accountId: "ryt" },
  { ...base, id: "transfer-out", type: "transfer", amount: 20, fromAccountId: "ryt", toAccountId: "maybank" },
  { ...base, id: "transfer-in", type: "transfer", amount: 5, fromAccountId: "maybank", toAccountId: "ryt" },
]
describe("recorded account source activity", () => {
  it("includes incoming, outgoing and each source's side of transfers", () => {
    expect(accountActivity("ryt", transactions)).toEqual({ incoming: 55, outgoing: 30, count: 4 })
    expect(accountActivity("maybank", transactions)).toEqual({ incoming: 20, outgoing: 5, count: 2 })
  })
  it("filters the selected month and never invents missing transactions", () => {
    expect(accountActivity("ryt", transactions, "2026-10")).toEqual({ incoming: 0, outgoing: 0, count: 0 })
    expect(accountActivity("other", transactions)).toEqual({ incoming: 0, outgoing: 0, count: 0 })
  })
})

import { describe, expect, it } from "vitest"
import { calculateAccountBalance } from "@/context/AccountsContext"
import { Account, Transaction } from "@/types"

const account: Account = { id: "ryt", name: "Ryt", currency: "MYR", openingBalance: 100, isActive: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }
const base = { categoryId: "cat_expense_other", description: "Test", date: "2026-09-21", createdAt: "2026-09-21T00:00:00.000Z", updatedAt: "2026-09-21T00:00:00.000Z" }

describe("account balances", () => {
  it("applies income, expense, and both sides of transfers without double counting", () => {
    const transactions: Transaction[] = [
      { ...base, id: "in", type: "income", amount: 50, accountId: "ryt" },
      { ...base, id: "out", type: "expense", amount: 10, accountId: "ryt" },
      { ...base, id: "transfer-out", type: "transfer", amount: 20, fromAccountId: "ryt", toAccountId: "maybank" },
      { ...base, id: "transfer-in", type: "transfer", amount: 5, fromAccountId: "maybank", toAccountId: "ryt" },
    ]
    expect(calculateAccountBalance(account, transactions)).toBe(125)
  })
})

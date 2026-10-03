import "@testing-library/jest-dom/vitest"
import { expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { TransactionRow } from "../TransactionRow"
import type { Transaction } from "@/types"
vi.mock("@/context/AccountsContext", () => ({ useAccounts: () => ({ accounts: [{ id: "bank", name: "Ryt" }] }) }))
vi.mock("@/context/SettingsContext", () => ({ useSettingsContext: () => ({ fmt: (n: number) => `RM${n}` }) }))
const entry: Transaction = { id: "t", type: "expense", amount: 55, accountId: "bank", description: "Lunch", categoryId: "food", date: "2026-10-03", createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z" }
it("whole-row tap opens details; destructive actions appear only inside details", () => {
  const edit = vi.fn(), remove = vi.fn()
  render(<table><tbody><TransactionRow transaction={entry} categories={[]} onEditRequest={edit} onDeleteRequest={remove} /></tbody></table>)
  expect(screen.queryByRole("button", { name: "Delete Lunch" })).toBeNull()
  fireEvent.click(screen.getByText("-RM55"))
  expect(screen.getByRole("dialog")).toBeVisible()
  expect(screen.getByRole("button", { name: "Delete Lunch" })).toBeVisible()
  fireEvent.click(screen.getByRole("button", { name: "Edit Lunch" }))
  expect(edit).toHaveBeenCalledWith(entry)
  expect(remove).not.toHaveBeenCalled()
})
it("row taps select rather than open details during bulk selection", () => {
  const toggle = vi.fn()
  render(<table><tbody><TransactionRow transaction={entry} categories={[]} onEditRequest={vi.fn()} onDeleteRequest={vi.fn()} selectMode onToggleSelect={toggle} /></tbody></table>)
  fireEvent.click(screen.getByText("-RM55"))
  expect(toggle).toHaveBeenCalledWith("t")
  expect(screen.queryByRole("dialog")).toBeNull()
})

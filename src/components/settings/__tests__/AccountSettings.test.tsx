import "@testing-library/jest-dom/vitest"
import { beforeEach, expect, it } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { VaultProvider } from "@/context/VaultContext"
import { AccountsProvider } from "@/context/AccountsContext"
import { SettingsProvider } from "@/context/SettingsContext"
import { AccountSettings } from "../AccountSettings"
import { STORAGE_KEYS } from "@/lib/constants"
const legacy = { id: "old", name: "Old card", kind: "credit_card", currency: "MYR", openingBalance: 120, creditLimit: 1000, statementBalance: 90, statementDate: "2026-09-30", dueDate: "2026-10-20", isActive: true, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z" }
const entry = { id: "purchase", type: "expense", amount: 12.50, categoryId: "cat_food", description: "Lunch", date: "2026-10-01", accountId: "old", createdAt: legacy.createdAt, updatedAt: legacy.updatedAt }
const app = <VaultProvider><AccountsProvider><SettingsProvider><AccountSettings /></SettingsProvider></AccountsProvider></VaultProvider>
beforeEach(() => localStorage.clear())
it("creates a source without requesting any balance or card statement", async () => {
  render(app)
  fireEvent.click(await screen.findByRole("button", { name: "Add account" }))
  expect(screen.queryByLabelText(/Opening|Credit limit|Statement|due date/i)).toBeNull()
  fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "My wallet" } })
  fireEvent.change(screen.getByLabelText("Account kind"), { target: { value: "ewallet" } })
  fireEvent.submit(screen.getByRole("form", { name: "New account" }))
  await screen.findByRole("heading", { name: "My wallet" })
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS) ?? "[]")
  expect(saved[0]).toMatchObject({ name: "My wallet", kind: "ewallet", openingBalance: 0 })
  expect(saved[0].creditLimit).toBeUndefined()
})
it("renames an existing source without deleting transactions or legacy backup metadata", async () => {
  localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify([legacy]))
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify([entry]))
  render(app)
  await screen.findByRole("heading", { name: "Old card" })
  expect(screen.queryByText(/Current outstanding|Statement snapshot|Estimated available credit/)).toBeNull()
  fireEvent.change(screen.getByLabelText("Account name"), { target: { value: "Personal card" } })
  fireEvent.submit(screen.getByRole("form", { name: "Edit account Old card" }))
  await waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS) ?? "[]")[0]).toMatchObject({ ...legacy, name: "Personal card", updatedAt: expect.any(String) }))
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) ?? "[]")).toEqual([entry])
})

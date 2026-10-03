import "@testing-library/jest-dom/vitest"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { TransactionForm } from "../TransactionForm"
import { DEFAULT_CATEGORIES } from "@/lib/constants"

vi.mock("@/context/AccountsContext", () => ({ useAccounts: () => ({ accounts: [{ id: "bank", name: "Bank", currency: "MYR", isActive: true }] }) }))
vi.mock("@/hooks/useCategories", () => ({ useCategories: () => ({ addCategory: vi.fn() }) }))
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ showToast: vi.fn() }) }))

it("awaits persistence, blocks re-entry and keeps the same retry command and draft after failure", async () => {
  let complete!: (saved: boolean) => void
  const onSubmit = vi.fn().mockImplementationOnce(() => new Promise<boolean>(resolve => { complete = resolve })).mockResolvedValueOnce(true)
  render(<TransactionForm transaction={{ id: "existing", type: "expense", amount: 50, categoryId: "cat_food", description: "Lunch", date: "2026-10-03", accountId: "bank", createdAt: "2026-10-03T00:00:00Z", updatedAt: "2026-10-03T00:00:00Z" }} categories={DEFAULT_CATEGORIES} onSubmit={onSubmit} onCancel={vi.fn()} />)
  fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "55" } })
  fireEvent.submit(screen.getByRole("form", { name: "Transaction editor" }))
  await waitFor(() => expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled())
  fireEvent.submit(screen.getByRole("form", { name: "Transaction editor" }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
  await act(async () => { complete(false) })
  await waitFor(() => expect(screen.getByRole("button", { name: "Save Changes" })).toBeEnabled())
  expect(screen.getByLabelText("Amount")).toHaveValue(55)
  expect(screen.getByRole("alert")).toHaveTextContent("Your input is kept")
  fireEvent.submit(screen.getByRole("form", { name: "Transaction editor" }))
  await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
  expect(onSubmit.mock.calls[0][0].commandId).toBe(onSubmit.mock.calls[1][0].commandId)
})

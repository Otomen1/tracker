import type { Account, Category, PendingTransaction, Transaction } from "@/types"

// Keep legacy decimal payloads losslessly. All new monetary inputs use at most
// two decimal places; rounding occurs only at the display boundary.
export function parseMoney(value: string): number {
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(value.trim())) throw new Error("Use a number with at most two decimal places.")
  const amount = Number(value)
  if (!Number.isFinite(amount) || Math.abs(amount) > Number.MAX_SAFE_INTEGER / 100) throw new Error("Amount is too large.")
  return amount
}

export function accountActivity(accountId: string, transactions: Transaction[], month?: string) {
  let incoming = 0, outgoing = 0, count = 0
  for (const item of transactions) {
    if (month && !item.date.startsWith(month + "-")) continue
    const received = item.type === "income" && item.accountId === accountId || item.type === "transfer" && item.toAccountId === accountId
    const sent = item.type === "expense" && item.accountId === accountId || item.type === "transfer" && item.fromAccountId === accountId
    if (received) incoming += item.amount
    if (sent) outgoing += item.amount
    if (received || sent) count++
  }
  return { incoming: Math.round(incoming * 100) / 100, outgoing: Math.round(outgoing * 100) / 100, count }
}

export function validateEntry(item: Transaction, accounts: Account[], categories: Category[], previous?: Transaction): void {
  if (!Number.isFinite(item.amount) || item.amount <= 0) throw new Error("Enter a positive amount.")
  if (!item.description.trim()) throw new Error("Enter a description.")
  const usable = (id: string | undefined, oldId?: string) => {
    const account = accounts.find(a => a.id === id)
    if (!account || (!account.isActive && id !== oldId)) throw new Error("Choose an active account.")
    return account
  }
  if (item.type === "transfer") {
    const from = usable(item.fromAccountId, previous?.fromAccountId)
    const to = usable(item.toAccountId, previous?.toAccountId)
    if (from.id === to.id) throw new Error("From and To must be different accounts.")
    if (from.currency !== to.currency) throw new Error("Transfers require accounts with the same currency. FX is not supported.")
    if (item.isRecurring) throw new Error("Recurring transfers are not supported.")
  } else {
    const category = categories.find(c => c.id === item.categoryId)
    if (!category || category.type !== (item.isRefund ? "expense" : item.type)) throw new Error("Choose a category matching the transaction type.")
    // Historical browser entries may remain unassigned; new entries must use an
    // account once accounts exist. Editing that legacy entry preserves it.
    if (accounts.length && (item.accountId || !previous || previous.accountId)) usable(item.accountId, previous?.accountId)
  }
  if (item.isRefund && (item.type !== "income" || accounts.find(a => a.id === item.accountId)?.kind !== "credit_card")) throw new Error("Refunds must be received into a credit card.")
}

export function transferEndpoints(pending: PendingTransaction, otherId: string) {
  return pending.direction === "income"
    ? { fromAccountId: otherId, toAccountId: pending.accountId }
    : { fromAccountId: pending.accountId, toAccountId: otherId }
}

export function hasFingerprint(item: Transaction, fingerprint: string): boolean {
  return item.notificationSource?.fingerprint === fingerprint || !!item.linkedNotifications?.some(n => n.fingerprint === fingerprint)
}

export function spendingAmount(item: Transaction): number {
  return item.type === "expense" ? item.amount : item.isRefund ? -item.amount : 0
}

export const analyticEntries = (items: Transaction[]): Transaction[] => items.map(t => t.isRefund ? { ...t, type: "expense", amount: -t.amount, isRefund: false } : t)

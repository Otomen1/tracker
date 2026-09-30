"use client"

import { createContext, useCallback, useContext, useEffect, useMemo } from "react"
import { useVault } from "@/context/VaultContext"
import { getMonthKey } from "@/lib/formatters"
import { applyBulkDelete, applyBulkRecategorize, applyBulkRestore } from "@/lib/transactionBatch"
import type { EntryType, PendingTransaction, Transaction, TransactionFormData } from "@/types"

export type CapturedTransactionResult = "added" | "duplicate" | "failed"
type Mutation = (current: Transaction[]) => Transaction[]

interface TransactionsContextValue {
  transactions: Transaction[]
  addTransaction: (data: TransactionFormData) => Promise<boolean>
  updateTransaction: (id: string, data: TransactionFormData) => Promise<boolean>
  deleteTransaction: (id: string) => Promise<boolean>
  deleteWithCascade: (id: string) => Promise<boolean>
  restoreTransaction: (transaction: Transaction) => Promise<boolean>
  bulkDeleteTransactions: (ids: string[], cascade: boolean) => Promise<boolean>
  bulkRestoreTransactions: (items: Transaction[]) => Promise<boolean>
  bulkRecategorize: (ids: string[], categoryId: string) => Promise<boolean>
  confirmCaptured: (pending: PendingTransaction, data: { type: EntryType; amount: number; categoryId: string; description: string; date: string; accountId: string }) => Promise<CapturedTransactionResult>
  confirmTransfer: (pending: PendingTransaction, fromAccountId: string, toAccountId: string, description: string, date: string) => Promise<CapturedTransactionResult>
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate: mutateVault, unlocked } = useVault()
  const transactions = data.transactions

  const mutate = useCallback((mutation: Mutation) => mutateVault((current) => ({
    ...current,
    transactions: mutation(current.transactions),
  })), [mutateVault])

  const generateRecurring = useCallback(() => {
    if (!unlocked) return
    void mutate((current) => {
      const currentMonth = getMonthKey()
      const additions: Transaction[] = []
      for (const template of current.filter((item) => item.isRecurring && !item.recurringId)) {
        if (current.some((item) => item.recurringId === template.id && item.date.startsWith(currentMonth))) continue
        const [year, month] = currentMonth.split("-").map(Number)
        const maxDay = new Date(year, month, 0).getDate()
        const day = String(Math.min(template.recurringDay ?? 1, maxDay)).padStart(2, "0")
        const now = new Date().toISOString()
        additions.push({
          ...template,
          id: crypto.randomUUID(),
          date: `${currentMonth}-${day}`,
          isRecurring: false,
          recurringId: template.id,
          createdAt: now,
          updatedAt: now,
        })
      }
      return additions.length ? [...additions, ...current] : current
    })
  }, [mutate, unlocked])

  useEffect(() => {
    generateRecurring()
    const onVisible = () => { if (document.visibilityState === "visible") generateRecurring() }
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("focus", generateRecurring)
    return () => {
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("focus", generateRecurring)
    }
  }, [generateRecurring])

  const addTransaction = useCallback((data: TransactionFormData) => mutate((current) => {
    const now = new Date().toISOString()
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: data.type,
      amount: Number.parseFloat(data.amount),
      categoryId: data.categoryId,
      description: data.description,
      date: data.date,
      notes: data.notes || undefined,
      tags: data.tags?.length ? data.tags : undefined,
      isRecurring: data.isRecurring || undefined,
      recurringDay: data.isRecurring ? (data.recurringDay ?? new Date().getDate()) : undefined,
      createdAt: now,
      updatedAt: now,
      accountId: data.accountId,
    }
    return [transaction, ...current]
  }), [mutate])

  const updateTransaction = useCallback((id: string, data: TransactionFormData) => mutate((current) =>
    current.map((item) => item.id === id ? {
      ...item,
      ...data,
      amount: Number.parseFloat(data.amount),
      notes: data.notes || undefined,
      tags: data.tags?.length ? data.tags : undefined,
      isRecurring: data.isRecurring || undefined,
      recurringDay: data.isRecurring ? (data.recurringDay ?? item.recurringDay) : undefined,
      updatedAt: new Date().toISOString(),
    } : item)
  ), [mutate])

  const confirmCaptured = useCallback(async (pending: PendingTransaction, data: { type: EntryType; amount: number; categoryId: string; description: string; date: string; accountId: string }): Promise<CapturedTransactionResult> => {
    const now = new Date().toISOString()
    let duplicate = false
    const saved = await mutate((current) => {
      if (current.some((item) => item.notificationSource?.fingerprint === pending.fingerprint)) {
        duplicate = true
        return current
      }
      return [{
        id: crypto.randomUUID(), type: data.type, amount: data.amount, categoryId: data.categoryId,
        description: data.description, date: data.date, accountId: data.accountId,
        notificationSource: { provider: pending.provider, fingerprint: pending.fingerprint, capturedAt: pending.capturedAt },
        createdAt: now, updatedAt: now,
      }, ...current]
    })
    return !saved ? "failed" : duplicate ? "duplicate" : "added"
  }, [mutate])

  const confirmTransfer = useCallback(async (pending: PendingTransaction, fromAccountId: string, toAccountId: string, description: string, date: string): Promise<CapturedTransactionResult> => {
    if (fromAccountId === toAccountId) return "failed"
    const now = new Date().toISOString()
    let duplicate = false
    const saved = await mutate((current) => {
      if (current.some((item) => item.notificationSource?.fingerprint === pending.fingerprint)) {
        duplicate = true
        return current
      }
      return [{
        id: crypto.randomUUID(), type: "transfer" as const, amount: pending.amount, categoryId: "", description, date,
        accountId: fromAccountId, fromAccountId, toAccountId,
        notificationSource: { provider: pending.provider, fingerprint: pending.fingerprint, capturedAt: pending.capturedAt },
        createdAt: now, updatedAt: now,
      }, ...current]
    })
    return !saved ? "failed" : duplicate ? "duplicate" : "added"
  }, [mutate])

  const deleteTransaction = useCallback((id: string) => mutate((current) => current.filter((item) => item.id !== id)), [mutate])
  const deleteWithCascade = useCallback((id: string) => mutate((current) => current.filter((item) => item.id !== id && item.recurringId !== id)), [mutate])
  const restoreTransaction = useCallback((transaction: Transaction) => mutate((current) => [transaction, ...current]), [mutate])
  const bulkDeleteTransactions = useCallback((ids: string[], cascade: boolean) => mutate((current) => applyBulkDelete(current, ids, cascade)), [mutate])
  const bulkRestoreTransactions = useCallback((items: Transaction[]) => mutate((current) => applyBulkRestore(current, items)), [mutate])
  const bulkRecategorize = useCallback((ids: string[], categoryId: string) => mutate((current) => applyBulkRecategorize(current, ids, categoryId, new Date().toISOString())), [mutate])

  const value = useMemo<TransactionsContextValue>(() => ({
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteWithCascade,
    restoreTransaction,
    bulkDeleteTransactions,
    bulkRestoreTransactions,
    bulkRecategorize,
    confirmCaptured,
    confirmTransfer,
  }), [transactions, addTransaction, updateTransaction, deleteTransaction, deleteWithCascade, restoreTransaction,
    bulkDeleteTransactions, bulkRestoreTransactions, bulkRecategorize, confirmCaptured, confirmTransfer])

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactionsContext() {
  const context = useContext(TransactionsContext)
  if (!context) throw new Error("useTransactions must be used within TransactionsProvider")
  return context
}

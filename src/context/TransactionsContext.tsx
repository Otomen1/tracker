"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { STORAGE_KEYS } from "@/lib/constants"
import { getMonthKey } from "@/lib/formatters"
import { applyBulkDelete, applyBulkRecategorize, applyBulkRestore } from "@/lib/transactionBatch"
import { EntryType, PendingTransaction, Transaction, TransactionFormData } from "@/types"

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
const SAME_TAB_EVENT = "tracker-storage-change"
const WRITE_FAILED_EVENT = "storage-write-failed"

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  // Never read localStorage during the initial render: server and browser must
  // first agree on an empty snapshot, then load persisted data after hydration.
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const currentRef = useRef(transactions)

  const replaceFromStorage = useCallback((raw: string | null) => {
    try {
      const next = JSON.parse(raw ?? "[]")
      if (!Array.isArray(next)) return
      currentRef.current = next
      setTransactions(next)
    } catch {
      // A recovery warning is handled by the storage validation layer.
    }
  }, [])

  useEffect(() => {
    // Load browser data after hydration before recurring-transaction generation.
    replaceFromStorage(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS))
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === STORAGE_KEYS.TRANSACTIONS) {
        replaceFromStorage(event.newValue)
      }
    }
    const handleSameTab = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: string }>).detail
      if (detail?.key === STORAGE_KEYS.TRANSACTIONS) replaceFromStorage(detail.value)
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener(SAME_TAB_EVENT, handleSameTab)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(SAME_TAB_EVENT, handleSameTab)
    }
  }, [replaceFromStorage])

  const mutate = useCallback(async (mutation: Mutation): Promise<boolean> => {
    const commit = () => {
      const current = (() => { try { const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS); const parsed = JSON.parse(raw ?? "[]"); return Array.isArray(parsed) ? parsed : currentRef.current } catch { return currentRef.current } })()
      const next = mutation(current)
    if (next === current || JSON.stringify(next) === JSON.stringify(current)) return true

    try {
      const serialized = JSON.stringify(next)
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, serialized)
      currentRef.current = next
      setTransactions(next)
      window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, {
        detail: { key: STORAGE_KEYS.TRANSACTIONS, value: serialized },
      }))
      return true
    } catch (error) {
      const quotaExceeded = error instanceof DOMException && error.name === "QuotaExceededError"
      window.dispatchEvent(new CustomEvent(quotaExceeded ? "storage-quota-exceeded" : WRITE_FAILED_EVENT))
      return false
    }
    }
    try {
      if (typeof navigator !== "undefined" && "locks" in navigator) {
        return await navigator.locks.request("tracker-transactions", { mode: "exclusive" }, commit)
      }
      return commit()
    } catch {
      window.dispatchEvent(new CustomEvent(WRITE_FAILED_EVENT))
      return false
    }
  }, [])

  const generateRecurring = useCallback(() => void mutate((current) => {
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
  }), [mutate])

  useEffect(() => {
    generateRecurring()
    const onVisibility = () => {
      if (document.visibilityState === "visible") generateRecurring()
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("focus", generateRecurring)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
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
      if (current.some((item) => item.notificationSource?.fingerprint === pending.fingerprint)) { duplicate = true; return current }
      return [{
      id: crypto.randomUUID(),
      type: data.type,
      amount: data.amount,
      categoryId: data.categoryId,
      description: data.description,
      date: data.date,
      accountId: data.accountId,
      notificationSource: { provider: pending.provider, fingerprint: pending.fingerprint, capturedAt: pending.capturedAt },
      createdAt: now,
      updatedAt: now,
    }, ...current]
    })
    return !saved ? "failed" : duplicate ? "duplicate" : "added"
  }, [mutate])

  const confirmTransfer = useCallback(async (pending: PendingTransaction, fromAccountId: string, toAccountId: string, description: string, date: string): Promise<CapturedTransactionResult> => {
    if (fromAccountId === toAccountId) return "failed"
    const now = new Date().toISOString()
    let duplicate = false
    const saved = await mutate((current) => {
      if (current.some((item) => item.notificationSource?.fingerprint === pending.fingerprint)) { duplicate = true; return current }
      return [{
      id: crypto.randomUUID(),
      type: "transfer" as const,
      amount: pending.amount,
      categoryId: "",
      description,
      date,
      accountId: fromAccountId,
      fromAccountId,
      toAccountId,
      notificationSource: { provider: pending.provider, fingerprint: pending.fingerprint, capturedAt: pending.capturedAt },
      createdAt: now,
      updatedAt: now,
    }, ...current]
    })
    return !saved ? "failed" : duplicate ? "duplicate" : "added"
  }, [mutate])

  const value: TransactionsContextValue = {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction: (id) => mutate((current) => current.filter((item) => item.id !== id)),
    deleteWithCascade: (id) => mutate((current) => current.filter((item) => item.id !== id && item.recurringId !== id)),
    restoreTransaction: (transaction) => mutate((current) => [transaction, ...current]),
    bulkDeleteTransactions: (ids, cascade) => mutate((current) => applyBulkDelete(current, ids, cascade)),
    bulkRestoreTransactions: (items) => mutate((current) => applyBulkRestore(current, items)),
    bulkRecategorize: (ids, categoryId) => mutate((current) =>
      applyBulkRecategorize(current, ids, categoryId, new Date().toISOString())
    ),
    confirmCaptured,
    confirmTransfer,
  }

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactionsContext(): TransactionsContextValue {
  const context = useContext(TransactionsContext)
  if (!context) throw new Error("useTransactions must be used within TransactionsProvider")
  return context
}

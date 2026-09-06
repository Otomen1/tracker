"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { STORAGE_KEYS } from "@/lib/constants"
import { getMonthKey } from "@/lib/formatters"
import { applyBulkDelete, applyBulkRecategorize, applyBulkRestore } from "@/lib/transactionBatch"
import { Transaction, TransactionFormData } from "@/types"

type Mutation = (current: Transaction[]) => Transaction[]

interface TransactionsContextValue {
  transactions: Transaction[]
  addTransaction: (data: TransactionFormData) => boolean
  updateTransaction: (id: string, data: TransactionFormData) => boolean
  deleteTransaction: (id: string) => boolean
  deleteWithCascade: (id: string) => boolean
  restoreTransaction: (transaction: Transaction) => boolean
  bulkDeleteTransactions: (ids: string[], cascade: boolean) => boolean
  bulkRestoreTransactions: (items: Transaction[]) => boolean
  bulkRecategorize: (ids: string[], categoryId: string) => boolean
}

const TransactionsContext = createContext<TransactionsContextValue | null>(null)
const SAME_TAB_EVENT = "tracker-storage-change"
const WRITE_FAILED_EVENT = "storage-write-failed"

function readStoredTransactions(): Transaction[] {
  if (typeof window === "undefined") return []
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.TRANSACTIONS) ?? "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(readStoredTransactions)
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

  const mutate = useCallback((mutation: Mutation): boolean => {
    const current = currentRef.current
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
  }, [])

  const generateRecurring = useCallback(() => mutate((current) => {
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
  }

  return <TransactionsContext.Provider value={value}>{children}</TransactionsContext.Provider>
}

export function useTransactionsContext(): TransactionsContextValue {
  const context = useContext(TransactionsContext)
  if (!context) throw new Error("useTransactions must be used within TransactionsProvider")
  return context
}

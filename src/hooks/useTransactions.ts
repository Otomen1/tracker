"use client"

import { useEffect } from "react"
import { Transaction, TransactionFormData } from "@/types"
import { useLocalStorage } from "./useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"
import { getMonthKey, getTodayString } from "@/lib/formatters"

export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS,
    []
  )

  // Auto-generate recurring transactions for the current month on mount, and
  // again whenever the tab regains focus/visibility (covers a tab left open
  // across a month boundary, which a mount-only effect would miss).
  useEffect(() => {
    const generateRecurring = () => {
      const currentMonth = getMonthKey()
      setTransactions((prev) => {
        const templates = prev.filter((t) => t.isRecurring && !t.recurringId)
        const toAdd: Transaction[] = []

        for (const template of templates) {
          const alreadyExists = prev.some(
            (t) => t.recurringId === template.id && t.date.startsWith(currentMonth)
          )
          if (!alreadyExists) {
            const day = template.recurringDay ?? 1
            const [year, month] = currentMonth.split("-")
            const maxDay = new Date(parseInt(year), parseInt(month), 0).getDate()
            const paddedDay = String(Math.min(day, maxDay)).padStart(2, "0")
            const now = new Date().toISOString()
            toAdd.push({
              ...template,
              id: crypto.randomUUID(),
              date: `${currentMonth}-${paddedDay}`,
              isRecurring: false,
              recurringId: template.id,
              createdAt: now,
              updatedAt: now,
            })
          }
        }

        return toAdd.length > 0 ? [...toAdd, ...prev] : prev
      })
    }

    generateRecurring()

    const handleVisibility = () => {
      if (document.visibilityState === "visible") generateRecurring()
    }
    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("focus", generateRecurring)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("focus", generateRecurring)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addTransaction = (data: TransactionFormData): void => {
    const now = new Date().toISOString()
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type: data.type,
      amount: parseFloat(data.amount),
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
    setTransactions((prev) => [newTransaction, ...prev])
  }

  const updateTransaction = (id: string, data: TransactionFormData): void => {
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              type: data.type,
              amount: parseFloat(data.amount),
              categoryId: data.categoryId,
              description: data.description,
              date: data.date,
              notes: data.notes || undefined,
              tags: data.tags?.length ? data.tags : undefined,
              isRecurring: data.isRecurring || undefined,
              recurringDay: data.isRecurring ? (data.recurringDay ?? t.recurringDay) : undefined,
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    )
  }

  const deleteTransaction = (id: string): void => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  const deleteWithCascade = (id: string): void => {
    setTransactions((prev) => prev.filter((t) => t.id !== id && t.recurringId !== id))
  }

  return { transactions, addTransaction, updateTransaction, deleteTransaction, deleteWithCascade }
}

"use client"

import { Transaction, TransactionFormData } from "@/types"
import { useLocalStorage } from "./useLocalStorage"
import { STORAGE_KEYS } from "@/lib/constants"

export function useTransactions() {
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>(
    STORAGE_KEYS.TRANSACTIONS,
    []
  )

  const addTransaction = (data: TransactionFormData): void => {
    const now = new Date().toISOString()
    const newTransaction: Transaction = {
      id: crypto.randomUUID(),
      type: data.type,
      amount: parseFloat(data.amount),
      categoryId: data.categoryId,
      description: data.description,
      date: data.date,
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
              updatedAt: new Date().toISOString(),
            }
          : t
      )
    )
  }

  const deleteTransaction = (id: string): void => {
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  return { transactions, addTransaction, updateTransaction, deleteTransaction }
}

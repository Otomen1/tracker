import { Transaction, Category } from "@/types"
import { DEFAULT_CATEGORIES, STORAGE_KEYS, SCHEMA_VERSION } from "./constants"

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeWrite(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

export function getTransactions(): Transaction[] {
  return safeRead<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, [])
}

export function saveTransactions(transactions: Transaction[]): void {
  safeWrite(STORAGE_KEYS.TRANSACTIONS, transactions)
}

export function getCategories(): Category[] {
  return safeRead<Category[]>(STORAGE_KEYS.CATEGORIES, [])
}

export function saveCategories(categories: Category[]): void {
  safeWrite(STORAGE_KEYS.CATEGORIES, categories)
}

export function initializeStorage(): void {
  if (typeof window === "undefined") return
  const version = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)
  if (!version) {
    const existing = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (!existing) {
      saveCategories(DEFAULT_CATEGORIES)
    }
    safeWrite(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
  }
}

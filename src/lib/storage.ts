import { Transaction, Category, Settings } from "@/types"
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS, SCHEMA_VERSION } from "./constants"

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

export function getSettings(): Settings {
  return safeRead<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS)
}

export function saveSettings(settings: Settings): void {
  safeWrite(STORAGE_KEYS.SETTINGS, settings)
}

export function exportAllData(): string {
  if (typeof window === "undefined") return "{}"
  const data = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: getTransactions(),
    categories: getCategories(),
    settings: getSettings(),
  }
  return JSON.stringify(data, null, 2)
}

export function importAllData(json: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(json)
    if (!data.transactions || !Array.isArray(data.transactions)) {
      return { success: false, error: "Invalid backup file: missing transactions" }
    }
    if (data.categories && Array.isArray(data.categories)) {
      saveCategories(data.categories)
    }
    saveTransactions(data.transactions)
    if (data.settings) saveSettings(data.settings)
    return { success: true }
  } catch {
    return { success: false, error: "Could not parse backup file" }
  }
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

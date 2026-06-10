import { Transaction, Category, Settings } from "@/types"
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS, SCHEMA_VERSION } from "./constants"
import { isValidHexColor } from "./utils"

const FALLBACK_COLOR = "#6b7280"

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
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      window.dispatchEvent(new CustomEvent("storage-quota-exceeded"))
    }
  }
}

// --- Import validators ---

function isValidTransaction(t: unknown): boolean {
  if (!t || typeof t !== "object") return false
  const o = t as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    (o.type === "income" || o.type === "expense") &&
    typeof o.amount === "number" &&
    typeof o.categoryId === "string" &&
    typeof o.description === "string" &&
    typeof o.date === "string" &&
    typeof o.createdAt === "string" &&
    typeof o.updatedAt === "string"
  )
}

function isValidCategory(c: unknown): boolean {
  if (!c || typeof c !== "object") return false
  const o = c as Record<string, unknown>
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    (o.type === "income" || o.type === "expense" || o.type === "both") &&
    typeof o.color === "string" &&
    typeof o.isDefault === "boolean" &&
    typeof o.createdAt === "string"
  )
}

// --- Schema migrations ---

type Migration = { from: string; to: string; run: () => void }

const MIGRATIONS: Migration[] = [
  // Future migrations go here, e.g.:
  // { from: "1", to: "2", run: () => { /* transform stored data */ } },
]

function runMigrations(storedVersion: string | null): void {
  let version = storedVersion ?? "0"
  for (const migration of MIGRATIONS) {
    if (migration.from === version) {
      migration.run()
      version = migration.to
      safeWrite(STORAGE_KEYS.SCHEMA_VERSION, version)
    }
  }
}

// --- Public API ---

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

    const validTransactions = data.transactions.filter(isValidTransaction) as Transaction[]
    if (validTransactions.length !== data.transactions.length) {
      console.warn(
        `Import: skipped ${data.transactions.length - validTransactions.length} invalid transaction(s)`
      )
    }

    if (data.categories && Array.isArray(data.categories)) {
      const validCategories = data.categories
        .filter(isValidCategory)
        .map((c: Category) => ({
          ...c,
          color: isValidHexColor(c.color) ? c.color : FALLBACK_COLOR,
        })) as Category[]
      if (validCategories.length !== data.categories.length) {
        console.warn(
          `Import: skipped ${data.categories.length - validCategories.length} invalid category(s)`
        )
      }
      saveCategories(validCategories)
    }

    saveTransactions(validTransactions)
    if (data.settings) saveSettings(data.settings)
    return { success: true }
  } catch {
    return { success: false, error: "Could not parse backup file" }
  }
}

export function initializeStorage(): void {
  if (typeof window === "undefined") return
  const stored = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)
  if (!stored) {
    const existing = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (!existing) saveCategories(DEFAULT_CATEGORIES)
  }
  runMigrations(stored)
  safeWrite(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
}

import { z } from "zod"
import { Transaction, Category, Settings } from "@/types"
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS, SCHEMA_VERSION } from "./constants"
import { isValidHexColor } from "./utils"

const FALLBACK_COLOR = "#6b7280"

const validDate = z.string().refine((v) => !isNaN(new Date(v).getTime()), "Invalid date")

const transactionSchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense"]),
  amount: z.number().finite().safe().positive(),
  categoryId: z.string(),
  description: z.string().max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => !isNaN(new Date(v).getTime()), "Invalid date"),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().optional(),
  recurringId: z.string().optional(),
  createdAt: validDate,
  updatedAt: validDate,
})

const categorySchema = z.object({
  id: z.string(),
  name: z.string().max(30),
  type: z.preprocess(
    (v) => (v === "both" ? "expense" : v),
    z.enum(["income", "expense"])
  ),
  color: z.string().regex(/^#[0-9A-Fa-f]{3,6}$/, "Invalid color"),
  isDefault: z.boolean(),
  budget: z.number().optional(),
  createdAt: validDate,
})

const settingsSchema = z.object({
  currency: z.string(),
  theme: z.enum(["light", "dark", "system"]),
  monthlySavingsGoal: z.number(),
  backupInterval: z.enum(["never", "daily", "weekly", "monthly"]).optional(),
  lastBackupAt: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

const backupSchema = z.object({
  transactions: z.array(transactionSchema).max(50000),
  categories: z.array(categorySchema).max(500).optional(),
  settings: settingsSchema.optional(),
})

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

// --- Import validators (used for lenient import path) ---

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

// A09: structured security event log (console only — no financial data included)
export function logSecurityEvent(event: string, meta?: Record<string, unknown>): void {
  console.info(`[Security] ${new Date().toISOString()} ${event}`, meta ?? "")
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
  const json = JSON.stringify(data, null, 2)
  logSecurityEvent("backup_export", { transactionCount: data.transactions.length })
  return json
}

export function importAllData(json: string): { success: boolean; error?: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { success: false, error: "Could not parse backup file" }
  }

  // Basic structure check: must have a transactions array
  if (!parsed || typeof parsed !== "object") {
    return { success: false, error: "Invalid backup file: missing transactions" }
  }
  const raw = parsed as Record<string, unknown>
  if (!raw.transactions || !Array.isArray(raw.transactions)) {
    return { success: false, error: "Invalid backup file: missing transactions" }
  }

  // Try strict Zod validation first (enforces data integrity: amounts, dates, limits)
  const result = backupSchema.safeParse(parsed)
  if (result.success) {
    const data = result.data
    if (data.categories) saveCategories(data.categories)
    saveTransactions(data.transactions)
    if (data.settings) saveSettings(data.settings)

    const version = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)
    if (!version) {
      if (!data.categories) saveCategories(DEFAULT_CATEGORIES)
      safeWrite(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
    }
    logSecurityEvent("backup_import_success", { transactionCount: data.transactions.length })
    return { success: true }
  }

  // Check if Zod failed due to transactions data integrity (not just format compat)
  // If transactions array has data errors, propagate the Zod error
  const txnSchema = z.array(transactionSchema).max(50000)
  const txnCheck = txnSchema.safeParse(raw.transactions)
  if (!txnCheck.success) {
    const msg = txnCheck.error.issues[0]?.message ?? "Invalid backup file"
    logSecurityEvent("backup_import_failure", { reason: "schema_validation", error: msg })
    return { success: false, error: `Invalid backup file: ${msg}` }
  }

  // Fall back to lenient validation for category format compatibility
  // (e.g., old "both" category type from earlier app versions)
  try {
    if (raw.categories && Array.isArray(raw.categories)) {
      const validCategories = raw.categories
        .filter(isValidCategory)
        .map((c: Category) => ({
          ...c,
          type: c.type === ("both" as string) ? "expense" : c.type,
          color: isValidHexColor(c.color) ? c.color : FALLBACK_COLOR,
        })) as Category[]
      if (validCategories.length !== raw.categories.length) {
        console.warn(
          `Import: skipped ${raw.categories.length - validCategories.length} invalid category(s)`
        )
      }
      saveCategories(validCategories)
    }

    saveTransactions(txnCheck.data)
    if (raw.settings) saveSettings(raw.settings as Settings)
    logSecurityEvent("backup_import_success_lenient", { transactionCount: txnCheck.data.length })
    return { success: true }
  } catch {
    logSecurityEvent("backup_import_failure", { reason: "parse_error" })
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

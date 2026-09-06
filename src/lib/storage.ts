import { z } from "zod"
import { Transaction, Category, Settings } from "@/types"
import { CURRENCIES, DEFAULT_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS, SCHEMA_VERSION } from "./constants"
import { isValidHexColor } from "./utils"

const FALLBACK_COLOR = "#6b7280"

const validDate = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date")
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}, "Invalid date")
const currencyCodes = CURRENCIES.map((currency) => currency.code)

const transactionSchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense"]),
  amount: z.number().finite().safe().positive(),
  categoryId: z.string(),
  description: z.string().trim().min(1).max(200),
  date: calendarDate,
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(1).max(31).optional(),
  recurringId: z.string().optional(),
  createdAt: validDate,
  updatedAt: validDate,
})

const categorySchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(30),
  type: z.preprocess(
    (v) => (v === "both" ? "expense" : v),
    z.enum(["income", "expense"])
  ),
  color: z.string().regex(/^#[0-9A-Fa-f]{3,6}$/, "Invalid color"),
  isDefault: z.boolean(),
  budget: z.number().finite().nonnegative().optional(),
  createdAt: validDate,
})

const settingsSchema = z.object({
  currency: z.string().refine((value) => currencyCodes.includes(value), "Unsupported currency"),
  theme: z.enum(["light", "dark", "system"]),
  monthlySavingsGoal: z.number().finite().nonnegative(),
  backupInterval: z.enum(["never", "daily", "weekly", "monthly"]).optional(),
  lastBackupAt: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
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
    settings: (() => { const legacy = getSettings() as Settings & { backupPassword?: string }; const { backupPassword: _secret, lastBackupAt: _deviceOnly, ...portable } = legacy; return portable })(),
  }
  const json = JSON.stringify(data, null, 2)
  logSecurityEvent("backup_export", { transactionCount: data.transactions.length })
  return json
}

type ImportPayload = {
  transactions: Transaction[]
  categories?: Category[]
  settings?: Settings
}

type RecoverySnapshot = {
  capturedAt: string
  values: Record<string, string | null>
}

const ATOMIC_KEYS = [
  STORAGE_KEYS.TRANSACTIONS,
  STORAGE_KEYS.CATEGORIES,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.SCHEMA_VERSION,
] as const

function restoreRawValues(values: Record<string, string | null>): void {
  for (const key of ATOMIC_KEYS) {
    const value = values[key]
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  }
}

function commitImport(payload: ImportPayload): { success: boolean; error?: string } {
  const previous = Object.fromEntries(ATOMIC_KEYS.map((key) => [key, localStorage.getItem(key)]))
  const recovery: RecoverySnapshot = { capturedAt: new Date().toISOString(), values: previous }

  try {
    localStorage.setItem(STORAGE_KEYS.RECOVERY, JSON.stringify(recovery))
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(payload.transactions))
    if (payload.categories) localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(payload.categories))
    if (payload.settings) localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(payload.settings))
    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
    localStorage.removeItem(STORAGE_KEYS.CORRUPTION)
    return { success: true }
  } catch (error) {
    try {
      restoreRawValues(previous)
    } catch {
      // Keep the recovery snapshot available if the browser cannot roll back immediately.
    }
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      window.dispatchEvent(new CustomEvent("storage-quota-exceeded"))
    }
    logSecurityEvent("backup_import_failure", { reason: "atomic_write_failed" })
    return { success: false, error: "Restore failed. Your previous data was kept." }
  }
}

function validateRelationships(payload: ImportPayload): string | undefined {
  const transactionIds = new Set<string>()
  for (const transaction of payload.transactions) {
    if (transactionIds.has(transaction.id)) return "Duplicate transaction ID"
    transactionIds.add(transaction.id)
  }

  const categories = payload.categories ?? getCategories()
  const categoryIds = new Set<string>()
  for (const category of categories) {
    if (categoryIds.has(category.id)) return "Duplicate category ID"
    categoryIds.add(category.id)
  }
  const missingCategory = payload.transactions.find((transaction) => !categoryIds.has(transaction.categoryId))
  if (missingCategory) return `Missing category for transaction "${missingCategory.description}"`
  return undefined
}

export function importAllData(json: string): { success: boolean; error?: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { success: false, error: "Could not parse backup file" }
  }
  if (!parsed || typeof parsed !== "object") {
    return { success: false, error: "Invalid backup file: missing transactions" }
  }

  const raw = parsed as Record<string, unknown>
  const transactionCheck = z.array(transactionSchema).max(50000).safeParse(raw.transactions)
  if (!transactionCheck.success) {
    const message = Array.isArray(raw.transactions)
      ? transactionCheck.error.issues[0]?.message ?? "Invalid transactions"
      : "missing transactions"
    return { success: false, error: `Invalid backup file: ${message}` }
  }

  let categories: Category[] | undefined
  if (raw.categories !== undefined) {
    if (!Array.isArray(raw.categories) || raw.categories.length > 500) {
      return { success: false, error: "Invalid backup file: invalid categories" }
    }
    categories = raw.categories
      .filter(isValidCategory)
      .map((category) => {
        const value = category as Category
        return {
          ...value,
          type: value.type === ("both" as string) ? "expense" : value.type,
          color: isValidHexColor(value.color) ? value.color : FALLBACK_COLOR,
        }
      })
    const categoryCheck = z.array(categorySchema).max(500).safeParse(categories)
    if (!categoryCheck.success) {
      return { success: false, error: `Invalid backup file: ${categoryCheck.error.issues[0]?.message ?? "invalid categories"}` }
    }
    categories = categoryCheck.data as Category[]
  }

  let settings: Settings | undefined
  if (raw.settings !== undefined) {
    const settingsCheck = settingsSchema.safeParse(raw.settings)
    if (!settingsCheck.success) return { success: false, error: "Invalid backup file: invalid settings" }
    settings = settingsCheck.data
  }

  const payload = { transactions: transactionCheck.data, categories, settings }
  const relationshipError = validateRelationships(payload)
  if (relationshipError) return { success: false, error: `Invalid backup file: ${relationshipError}` }

  const committed = commitImport(payload)
  if (committed.success) {
    logSecurityEvent("backup_import_success", { transactionCount: payload.transactions.length })
  }
  return committed
}

export function getStorageHealth(): { healthy: boolean; errors: string[]; hasRecovery: boolean } {
  if (typeof window === "undefined") return { healthy: true, errors: [], hasRecovery: false }
  const errors: string[] = []
  const checks = [
    [STORAGE_KEYS.TRANSACTIONS, z.array(transactionSchema)],
    [STORAGE_KEYS.CATEGORIES, z.array(categorySchema)],
    [STORAGE_KEYS.SETTINGS, settingsSchema],
  ] as const

  for (const [key, schema] of checks) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      if (!schema.safeParse(JSON.parse(raw)).success) errors.push(key)
    } catch {
      errors.push(key)
    }
  }
  return {
    healthy: errors.length === 0,
    errors,
    hasRecovery: localStorage.getItem(STORAGE_KEYS.RECOVERY) !== null,
  }
}

export function restoreRecoverySnapshot(): boolean {
  if (typeof window === "undefined") return false
  try {
    const snapshot = JSON.parse(localStorage.getItem(STORAGE_KEYS.RECOVERY) ?? "") as RecoverySnapshot
    restoreRawValues(snapshot.values)
    localStorage.removeItem(STORAGE_KEYS.CORRUPTION)
    return true
  } catch {
    return false
  }
}

export function initializeStorage(): void {
  if (typeof window === "undefined") return
  const health = getStorageHealth()
  if (!health.healthy) {
    localStorage.setItem(STORAGE_KEYS.CORRUPTION, JSON.stringify({ detectedAt: new Date().toISOString(), keys: health.errors }))
    return
  }
  const stored = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)
  if (!stored) {
    const existing = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (!existing) saveCategories(DEFAULT_CATEGORIES)
  }
  runMigrations(stored)
  safeWrite(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
}

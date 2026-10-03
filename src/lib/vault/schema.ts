import { z } from "zod"
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, SCHEMA_VERSION, STORAGE_KEYS } from "@/lib/constants"
import type { Account, Category, Settings, Transaction } from "@/types"

const timestamp = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid timestamp")
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split("-").map(Number)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day
}, "Invalid date")

export const transactionSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().finite().safe().positive(),
  categoryId: z.string().max(200),
  description: z.string().trim().min(1).max(200),
  date: calendarDate,
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isRefund: z.boolean().optional(),
  linkedNotifications: z.array(z.object({ provider: z.enum(["ryt", "mae", "google_wallet"]), fingerprint: z.string().min(16).max(128), capturedAt: timestamp })).max(20).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(1).max(31).optional(),
  recurringId: z.string().max(200).optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
  accountId: z.string().max(200).optional(),
  fromAccountId: z.string().max(200).optional(),
  toAccountId: z.string().max(200).optional(),
  notificationSource: z.object({
    provider: z.enum(["ryt", "mae", "google_wallet"]),
    fingerprint: z.string().min(16).max(128),
    capturedAt: timestamp,
  }).optional(),
}).superRefine((transaction, context) => {
  if (transaction.type === "transfer" && (!transaction.fromAccountId || !transaction.toAccountId || transaction.fromAccountId === transaction.toAccountId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid transfer accounts" })
  }
})

export const categorySchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(30),
  type: z.preprocess((value) => value === "both" ? "expense" : value, z.enum(["income", "expense"])),
  color: z.string().regex(/^#[0-9A-Fa-f]{3,6}$/),
  isDefault: z.boolean(),
  budget: z.number().finite().nonnegative().optional(),
  createdAt: timestamp,
})

export const accountSchema = z.object({
  kind: z.enum(["bank", "cash", "ewallet", "credit_card"]).optional(),
  creditLimit: z.number().finite().nonnegative().optional(),
  lastFour: z.string().regex(/^\d{4}$/).optional(),
  statementBalance: z.number().finite().optional(),
  statementDate: calendarDate.optional(),
  dueDate: calendarDate.optional(),
  id: z.string().min(1).max(200),
  name: z.string().trim().min(1).max(60),
  currency: z.string().length(3),
  openingBalance: z.number().finite().safe(),
  isActive: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
})

export const settingsSchema = z.object({
  currency: z.string().length(3),
  theme: z.enum(["light", "dark", "system"]),
  monthlySavingsGoal: z.number().finite().nonnegative(),
  backupInterval: z.enum(["never", "daily", "weekly", "monthly"]).optional(),
  lastBackupAt: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
})

export interface VaultData {
  schemaVersion: 4
  revision: number
  updatedAt: string
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  settings: Settings
  androidSetupComplete: boolean
}

export const vaultSchema = z.object({
  schemaVersion: z.union([z.literal(3), z.literal(4)]).transform(() => 4 as const),
  revision: z.number().int().nonnegative(),
  updatedAt: timestamp,
  transactions: z.array(transactionSchema).max(50_000),
  categories: z.array(categorySchema).max(500),
  accounts: z.array(accountSchema).max(50),
  settings: settingsSchema,
  androidSetupComplete: z.boolean(),
}).superRefine((vault, context) => {
  const duplicate = (items: { id: string }[]) => items.length !== new Set(items.map((item) => item.id)).size
  if (duplicate(vault.transactions)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate transaction ID" })
  if (duplicate(vault.categories)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate category ID" })
  if (duplicate(vault.accounts)) context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate account ID" })
})

function parseJson(raw: string | null, fallback: unknown, label: string): unknown {
  if (raw === null) return fallback
  try { return JSON.parse(raw) } catch { throw new Error(`${label} data is malformed`) }
}

export function emptyVault(): VaultData {
  return {
    schemaVersion: 4,
    revision: 0,
    updatedAt: new Date().toISOString(),
    transactions: [],
    categories: structuredClone(DEFAULT_CATEGORIES),
    accounts: [],
    settings: { ...DEFAULT_SETTINGS },
    androidSetupComplete: false,
  }
}

export function readLegacyVault(storage: Pick<Storage, "getItem">): VaultData {
  const marker = storage.getItem(STORAGE_KEYS.SCHEMA_VERSION)
  if (marker && !["1", "2", "3", "4"].includes(marker)) throw new Error("Unsupported newer storage schema. Update Tracker before opening this data.")
  const candidate = {
    ...emptyVault(),
    transactions: parseJson(storage.getItem(STORAGE_KEYS.TRANSACTIONS), [], "Transaction"),
    categories: parseJson(storage.getItem(STORAGE_KEYS.CATEGORIES), DEFAULT_CATEGORIES, "Category"),
    accounts: parseJson(storage.getItem(STORAGE_KEYS.ACCOUNTS), [], "Account"),
    settings: parseJson(storage.getItem(STORAGE_KEYS.SETTINGS), DEFAULT_SETTINGS, "Settings"),
    androidSetupComplete: storage.getItem(STORAGE_KEYS.ANDROID_SETUP) === "1",
  }
  const parsed = vaultSchema.safeParse(candidate)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Saved data failed validation")
  return parsed.data as VaultData
}

export function validateVault(value: unknown): VaultData {
  const parsed = vaultSchema.safeParse(value)
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Vault data failed validation")
  return parsed.data as VaultData
}

type WebStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">

const WEB_VAULT_KEYS = [
  STORAGE_KEYS.TRANSACTIONS,
  STORAGE_KEYS.CATEGORIES,
  STORAGE_KEYS.ACCOUNTS,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.ANDROID_SETUP,
  STORAGE_KEYS.SCHEMA_VERSION,
] as const

interface WebRecoverySnapshot {
  capturedAt: string
  values: Record<string, string | null>
}

export function writeWebVault(storage: WebStorage, vault: VaultData): void {
  const previous = Object.fromEntries(WEB_VAULT_KEYS.map((key) => [key, storage.getItem(key)]))
  const recovery: WebRecoverySnapshot = { capturedAt: new Date().toISOString(), values: previous }
  try {
    storage.setItem(STORAGE_KEYS.RECOVERY, JSON.stringify(recovery))
    storage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(vault.transactions))
    storage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(vault.categories))
    storage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(vault.accounts))
    storage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(vault.settings))
    storage.setItem(STORAGE_KEYS.ANDROID_SETUP, vault.androidSetupComplete ? "1" : "0")
    storage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
    storage.removeItem(STORAGE_KEYS.RECOVERY)
    storage.removeItem(STORAGE_KEYS.CORRUPTION)
  } catch (error) {
    let rolledBack = false
    try {
      for (const key of WEB_VAULT_KEYS) {
        const value = previous[key]
        if (value === null) storage.removeItem(key)
        else storage.setItem(key, value)
      }
      rolledBack = true
    } catch {
      // Keep the recovery snapshot when the browser cannot roll back now.
    }
    if (rolledBack) storage.removeItem(STORAGE_KEYS.RECOVERY)
    throw error
  }
}

export function hasWebRecovery(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(STORAGE_KEYS.RECOVERY) !== null
}

export function restoreWebRecovery(storage: WebStorage): VaultData {
  const raw = storage.getItem(STORAGE_KEYS.RECOVERY)
  if (!raw) throw new Error("No browser recovery snapshot is available")
  let snapshot: WebRecoverySnapshot
  try { snapshot = JSON.parse(raw) as WebRecoverySnapshot } catch { throw new Error("The browser recovery snapshot is damaged") }
  if (!snapshot.values || typeof snapshot.values !== "object") throw new Error("The browser recovery snapshot is damaged")
  for (const key of WEB_VAULT_KEYS) {
    const value = snapshot.values[key]
    if (value === null || value === undefined) storage.removeItem(key)
    else storage.setItem(key, value)
  }
  const restored = readLegacyVault(storage)
  storage.removeItem(STORAGE_KEYS.RECOVERY)
  return restored
}

export const SENSITIVE_LEGACY_KEYS = [
  STORAGE_KEYS.TRANSACTIONS,
  STORAGE_KEYS.CATEGORIES,
  STORAGE_KEYS.ACCOUNTS,
  STORAGE_KEYS.SETTINGS,
  STORAGE_KEYS.ANDROID_SETUP,
  STORAGE_KEYS.WALLET_MAPPINGS,
  STORAGE_KEYS.RECOVERY,
  STORAGE_KEYS.CORRUPTION,
  STORAGE_KEYS.SYNC_STATE,
] as const

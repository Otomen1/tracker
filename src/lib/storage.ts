import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "@/lib/constants"
import {
  accountSchema,
  categorySchema,
  readLegacyVault,
  settingsSchema,
  transactionSchema,
  validateVault,
  writeWebVault,
  type VaultData,
} from "@/lib/vault/schema"
import type { Account, Category, Settings, Transaction } from "@/types"
import { z } from "zod"

const backupSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal("1"), z.literal("2"), z.literal("3"), z.literal("4")]).optional(),
  exportedAt: z.string().optional(),
  transactions: z.array(transactionSchema).max(50_000),
  categories: z.array(categorySchema).max(500).default(DEFAULT_CATEGORIES),
  accounts: z.array(accountSchema).max(50).default([]),
  settings: settingsSchema.default(DEFAULT_SETTINGS),
  androidSetupComplete: z.boolean().optional(),
})

export type BackupImportResult = { success: true; vault: VaultData } | { success: false; error: string }

function portableSettings(settings: Settings): Settings {
  const legacy = settings as Settings & { backupPassword?: string }
  const { backupPassword: _secret, lastBackupAt: _deviceOnly, backupInterval: _schedule, ...portable } = legacy
  return portable
}

function duplicateId(items: { id: string }[]) {
  return items.length !== new Set(items.map((item) => item.id)).size
}

function relationshipError(transactions: Transaction[], categories: Category[], accounts: Account[]) {
  if (duplicateId(transactions)) return "Duplicate transaction ID"
  if (duplicateId(categories)) return "Duplicate category ID"
  if (duplicateId(accounts)) return "Duplicate account ID"
  if (new Set(accounts.map(a => a.currency)).size > 1) return "Mixed-currency backups are not supported; no data was replaced"
  const categoryIds = new Set(categories.map((category) => category.id))
  const missingCategory = transactions.find((item) => item.type !== "transfer" && !categoryIds.has(item.categoryId))
  if (missingCategory) return `Missing category for transaction "${missingCategory.description}"`
  const mismatched = transactions.find(item => item.type !== "transfer" && categories.find(c => c.id === item.categoryId)?.type !== (item.isRefund ? "expense" : item.type))
  if (mismatched) return `Category type does not match transaction "${mismatched.description}"`
  const accountIds = new Set(accounts.map((account) => account.id))
  const invalidAccount = transactions.find((item) =>
    (item.accountId && !accountIds.has(item.accountId)) ||
    (item.fromAccountId && !accountIds.has(item.fromAccountId)) ||
    (item.toAccountId && !accountIds.has(item.toAccountId)))
  if (invalidAccount) return `Missing account for transaction "${invalidAccount.description}"`
  return undefined
}

export function createBackupJson(vault: VaultData): string {
  const backup = {
    format: "tracker-portable-backup",
    schemaVersion: 4,
    exportedAt: new Date().toISOString(),
    transactions: vault.transactions,
    categories: vault.categories,
    accounts: vault.accounts,
    settings: portableSettings(vault.settings),
    androidSetupComplete: vault.androidSetupComplete,
  }
  logSecurityEvent("backup_export", { transactionCount: vault.transactions.length })
  return JSON.stringify(backup, null, 2)
}

export function parseBackupJson(json: string, current?: VaultData): BackupImportResult {
  let raw: unknown
  try { raw = JSON.parse(json) } catch { return { success: false, error: "Could not parse backup file" } }
  const parsed = backupSchema.safeParse(raw)
  if (!parsed.success) return { success: false, error: `Invalid backup file: ${parsed.error.issues[0]?.message ?? "schema validation failed"}` }

  const relationships = relationshipError(parsed.data.transactions, parsed.data.categories, parsed.data.accounts)
  if (relationships) return { success: false, error: `Invalid backup file: ${relationships}` }

  try {
    return { success: true, vault: validateVault({
      schemaVersion: 4,
      revision: current?.revision ?? 0,
      updatedAt: new Date().toISOString(),
      transactions: parsed.data.transactions,
      categories: parsed.data.categories,
      accounts: parsed.data.accounts,
      settings: { ...DEFAULT_SETTINGS, ...parsed.data.settings },
      androidSetupComplete: parsed.data.androidSetupComplete ?? parsed.data.accounts.length > 0,
    }) }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Invalid backup file" }
  }
}

// Compatibility helpers keep the local-only browser/PWA usable. The Android
// build uses VaultContext and never persists confirmed financial data here.
export function exportAllData(): string {
  if (typeof window === "undefined") return "{}"
  return createBackupJson(readLegacyVault(localStorage))
}

export function importAllData(json: string): { success: boolean; error?: string } {
  if (typeof window === "undefined") return { success: false, error: "Storage is unavailable" }
  let current: VaultData
  try { current = readLegacyVault(localStorage) } catch { current = validateVault({
    schemaVersion: 4, revision: 0, updatedAt: new Date().toISOString(), transactions: [], categories: DEFAULT_CATEGORIES,
    accounts: [], settings: DEFAULT_SETTINGS, androidSetupComplete: false,
  }) }
  const result = parseBackupJson(json, current)
  if (!result.success) return result
  try {
    writeWebVault(localStorage, result.vault)
    logSecurityEvent("backup_import_success", { transactionCount: result.vault.transactions.length })
    return { success: true }
  } catch {
    return { success: false, error: "Restore failed. Your previous data was kept." }
  }
}

export function logSecurityEvent(event: string, meta?: Record<string, unknown>) {
  console.info(`[Security] ${new Date().toISOString()} ${event}`, meta ?? "")
}

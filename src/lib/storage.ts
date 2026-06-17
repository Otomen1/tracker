import { z } from "zod"
import { Transaction, Category, Settings } from "@/types"
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS, SCHEMA_VERSION } from "./constants"

const transactionSchema = z.object({
  id: z.string(),
  type: z.enum(["income", "expense"]),
  amount: z.number(),
  categoryId: z.string(),
  description: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().optional(),
  recurringId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["income", "expense", "both"]),
  color: z.string(),
  isDefault: z.boolean(),
  budget: z.number().optional(),
  createdAt: z.string(),
})

const settingsSchema = z.object({
  currency: z.string(),
  theme: z.enum(["light", "dark", "system"]),
  monthlySavingsGoal: z.number(),
})

const backupSchema = z.object({
  transactions: z.array(transactionSchema),
  categories: z.array(categorySchema).optional(),
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
  } catch {
    // ignore quota errors
  }
}

export function exportAllData(): string {
  if (typeof window === "undefined") return "{}"
  const data = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    transactions: safeRead<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []),
    categories: safeRead<Category[]>(STORAGE_KEYS.CATEGORIES, []),
    settings: safeRead<Settings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS),
  }
  return JSON.stringify(data, null, 2)
}

export function importAllData(json: string): { success: boolean; error?: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { success: false, error: "Could not parse backup file" }
  }
  const result = backupSchema.safeParse(parsed)
  if (!result.success) {
    const msg = result.error.issues[0]?.message ?? "Invalid backup file"
    return { success: false, error: `Invalid backup file: ${msg}` }
  }
  const data = result.data
  if (data.categories) safeWrite(STORAGE_KEYS.CATEGORIES, data.categories)
  safeWrite(STORAGE_KEYS.TRANSACTIONS, data.transactions)
  if (data.settings) safeWrite(STORAGE_KEYS.SETTINGS, data.settings)

  const version = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION)
  if (!version) {
    if (!data.categories) safeWrite(STORAGE_KEYS.CATEGORIES, DEFAULT_CATEGORIES)
    safeWrite(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION)
  }

  return { success: true }
}

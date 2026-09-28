import { z } from "zod"

export const syncEntitySchema = z.enum(["transactions", "categories", "accounts", "settings"])
export type SyncEntity = z.infer<typeof syncEntitySchema>

const isoDate = z.string().datetime({ offset: true })

export const transactionSyncSchema = z.object({
  id: z.string().min(1).max(200),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().finite().positive(),
  categoryId: z.string().max(200),
  description: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().int().min(1).max(31).optional(),
  recurringId: z.string().max(200).optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
  accountId: z.string().max(200).optional(),
  fromAccountId: z.string().max(200).optional(),
  toAccountId: z.string().max(200).optional(),
  notificationSource: z.object({
    provider: z.enum(["ryt", "mae", "google_wallet"]),
    fingerprint: z.string().min(16).max(128),
    capturedAt: isoDate,
  }).optional(),
})

export const categorySyncSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(30),
  type: z.enum(["income", "expense"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{3,6}$/),
  isDefault: z.boolean(),
  budget: z.number().finite().nonnegative().optional(),
  createdAt: isoDate,
})

export const accountSyncSchema = z.object({
  id: z.string().min(1).max(200),
  name: z.string().min(1).max(60),
  currency: z.string().length(3),
  openingBalance: z.number().finite(),
  isActive: z.boolean(),
  createdAt: isoDate,
  updatedAt: isoDate,
})

export const settingsSyncSchema = z.object({
  currency: z.string().length(3),
  theme: z.enum(["light", "dark", "system"]),
  monthlySavingsGoal: z.number().finite().nonnegative(),
  backupInterval: z.enum(["never", "daily", "weekly", "monthly"]).optional(),
  lastBackupAt: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
})

export const entityDataSchemas = {
  transactions: transactionSyncSchema,
  categories: categorySyncSchema,
  accounts: accountSyncSchema,
  settings: settingsSyncSchema,
} as const

export const syncOperationSchema = z.object({
  opId: z.string().uuid(),
  entity: syncEntitySchema,
  recordId: z.string().min(1).max(200),
  modifiedAt: isoDate,
  deleted: z.boolean(),
  data: z.record(z.unknown()).nullable(),
})

export type SyncOperation = z.infer<typeof syncOperationSchema>

export const syncRequestSchema = z.object({
  deviceId: z.string().uuid(),
  cursor: z.number().int().nonnegative(),
  operations: z.array(syncOperationSchema).max(2000),
})

export const syncChangeSchema = z.object({
  entity: syncEntitySchema,
  recordId: z.string(),
  modifiedAt: isoDate,
  deleted: z.boolean(),
  data: z.record(z.unknown()).nullable(),
  version: z.number().int().positive(),
})

export const syncResponseSchema = z.object({
  cursor: z.number().int().nonnegative(),
  changes: z.array(syncChangeSchema),
  acknowledged: z.array(z.string().uuid()),
  rejected: z.array(z.object({ opId: z.string().uuid(), reason: z.string() })),
})

export type SyncChange = z.infer<typeof syncChangeSchema>
export type SyncResponse = z.infer<typeof syncResponseSchema>

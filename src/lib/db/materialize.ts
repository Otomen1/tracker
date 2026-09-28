import "server-only"
import type { PoolClient } from "pg"
import type { SyncEntity } from "@/lib/sync/contracts"

type Column = { column_name: string; data_type: string; udt_name: string }
type FieldMap = Record<string, readonly string[]>

const FIELD_MAPS: Record<SyncEntity, FieldMap> = {
  transactions: {
    id: ["id"], type: ["type"], amount: ["amount"], categoryId: ["category_id", "categoryId"],
    description: ["description"], date: ["date"], notes: ["notes"], tags: ["tags"],
    isRecurring: ["is_recurring", "isRecurring"], recurringDay: ["recurring_day", "recurringDay"],
    recurringId: ["recurring_id", "recurringId"], createdAt: ["created_at", "createdAt"],
    updatedAt: ["updated_at", "updatedAt"], accountId: ["account_id", "accountId"],
    fromAccountId: ["from_account_id", "fromAccountId"], toAccountId: ["to_account_id", "toAccountId"],
    notificationSource: ["notification_source", "notificationSource"],
  },
  categories: {
    id: ["id"], name: ["name"], type: ["type"], color: ["color"],
    isDefault: ["is_default", "isDefault"], budget: ["budget"], createdAt: ["created_at", "createdAt"],
    updatedAt: ["updated_at", "updatedAt"],
  },
  accounts: {
    id: ["id"], name: ["name"], currency: ["currency"],
    openingBalance: ["opening_balance", "openingBalance"], isActive: ["is_active", "isActive"],
    createdAt: ["created_at", "createdAt"], updatedAt: ["updated_at", "updatedAt"],
  },
  settings: {
    id: ["id", "settings_id"], currency: ["currency"], theme: ["theme"],
    monthlySavingsGoal: ["monthly_savings_goal", "monthlySavingsGoal"],
    backupInterval: ["backup_interval", "backupInterval"], lastBackupAt: ["last_backup_at", "lastBackupAt"],
    reminderEnabled: ["reminder_enabled", "reminderEnabled"], reminderTime: ["reminder_time", "reminderTime"],
    updatedAt: ["updated_at", "updatedAt"],
  },
}

const REQUIRED: Record<SyncEntity, string[]> = {
  transactions: ["id", "type", "amount", "categoryId", "description", "date", "createdAt", "updatedAt"],
  categories: ["id", "name", "type", "color", "isDefault", "createdAt"],
  accounts: ["id", "name", "currency", "openingBalance", "isActive", "createdAt", "updatedAt"],
  settings: ["currency", "theme", "monthlySavingsGoal"],
}

function quote(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`
}

async function columnsFor(client: PoolClient, table: SyncEntity): Promise<Map<string, Column>> {
  const result = await client.query<Column>(
    `SELECT column_name, data_type, udt_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`, [table]
  )
  return new Map(result.rows.map((column) => [column.column_name, column]))
}

function resolveColumns(entity: SyncEntity, available: Map<string, Column>) {
  const resolved = new Map<string, Column>()
  for (const [field, candidates] of Object.entries(FIELD_MAPS[entity])) {
    const name = candidates.find((candidate) => available.has(candidate))
    if (name) resolved.set(field, available.get(name)!)
  }
  const missing = REQUIRED[entity].filter((field) => !resolved.has(field))
  if (missing.length) throw new Error(`${entity} table is missing columns for: ${missing.join(", ")}`)
  return resolved
}

function dbValue(value: unknown, column: Column): unknown {
  if (value === undefined) return null
  if (column.data_type === "json" || column.data_type === "jsonb") return JSON.stringify(value)
  return value
}

function appValue(value: unknown, field: string, column: Column): unknown {
  if (value === null) return undefined
  if (value instanceof Date) {
    if (column.data_type === "date") return value.toISOString().slice(0, 10)
    return value.toISOString()
  }
  if (["amount", "budget", "openingBalance", "monthlySavingsGoal"].includes(field) && typeof value === "string") {
    return Number(value)
  }
  if ((column.data_type === "json" || column.data_type === "jsonb") && typeof value === "string") {
    try { return JSON.parse(value) } catch { return value }
  }
  return value
}

export async function inspectApplicationTables(client: PoolClient) {
  const result: Record<string, { columns: string[]; compatible: boolean; error?: string }> = {}
  for (const entity of ["accounts", "categories", "transactions", "settings"] as SyncEntity[]) {
    const columns = await columnsFor(client, entity)
    try {
      resolveColumns(entity, columns)
      result[entity] = { columns: Array.from(columns.keys()), compatible: true }
    } catch (error) {
      result[entity] = { columns: Array.from(columns.keys()), compatible: false, error: error instanceof Error ? error.message : "Unknown schema error" }
    }
  }
  return result
}

export async function readMaterializedRecords(client: PoolClient, entity: SyncEntity) {
  const available = await columnsFor(client, entity)
  const fields = resolveColumns(entity, available)
  const rows = await client.query<Record<string, unknown>>(`SELECT * FROM public.${quote(entity)}`)
  return rows.rows.map((row, index) => {
    const data: Record<string, unknown> = {}
    for (const [field, column] of Array.from(fields.entries())) {
      const value = appValue(row[column.column_name], field, column)
      if (value !== undefined) data[field] = value
    }
    const recordId = typeof data.id === "string" ? data.id : entity === "settings" && index === 0 ? "singleton" : ""
    return { recordId, data }
  }).filter((record) => record.recordId)
}

export async function materializeRecord(
  client: PoolClient,
  entity: SyncEntity,
  recordId: string,
  data: Record<string, unknown> | null,
  deleted: boolean,
  modifiedAt: string,
) {
  const available = await columnsFor(client, entity)
  const fields = resolveColumns(entity, available)
  const idColumn = fields.get("id")

  if (deleted) {
    if (!idColumn) {
      if (entity === "settings") return
      throw new Error(`${entity} cannot be deleted because it has no ID column`)
    }
    await client.query(`DELETE FROM public.${quote(entity)} WHERE ${quote(idColumn.column_name)} = $1`, [recordId])
    return
  }
  if (!data) throw new Error("A non-deleted operation must contain data")

  const materialized: Record<string, unknown> = { ...data, id: recordId, updatedAt: data.updatedAt ?? modifiedAt }
  const entries = Array.from(fields.entries()).filter(([field]) => materialized[field] !== undefined)
  if (!entries.length) throw new Error(`No compatible columns found for ${entity}`)
  const names = entries.map(([, column]) => quote(column.column_name))
  const values = entries.map(([field, column]) => dbValue(materialized[field], column))
  const placeholders = values.map((_, index) => `$${index + 1}`)

  if (!idColumn) {
    const count = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM public.${quote(entity)}`)
    if (Number(count.rows[0]?.count ?? 0) === 0) {
      await client.query(`INSERT INTO public.${quote(entity)} (${names.join(", ")}) VALUES (${placeholders.join(", ")})`, values)
    } else {
      const sets = entries.map(([, column], index) => `${quote(column.column_name)} = $${index + 1}`)
      await client.query(`UPDATE public.${quote(entity)} SET ${sets.join(", ")}`, values)
    }
    return
  }

  const updateEntries = entries.filter(([, column]) => column.column_name !== idColumn.column_name)
  const updates = updateEntries.map(([, column]) => `${quote(column.column_name)} = EXCLUDED.${quote(column.column_name)}`)
  await client.query(
    `INSERT INTO public.${quote(entity)} (${names.join(", ")}) VALUES (${placeholders.join(", ")})
     ON CONFLICT (${quote(idColumn.column_name)}) DO UPDATE SET ${updates.join(", ")}`,
    values,
  )
}

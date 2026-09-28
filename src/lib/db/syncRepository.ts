import "server-only"
import type { PoolClient } from "pg"
import { getPool } from "./pool"
import { entityDataSchemas, type SyncChange, type SyncOperation } from "@/lib/sync/contracts"
import { inspectApplicationTables, materializeRecord, readMaterializedRecords } from "./materialize"

export async function ensureSyncSchema(client: PoolClient, ownerId: string) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.accounts (
      id text PRIMARY KEY, name text NOT NULL, currency text NOT NULL,
      opening_balance numeric NOT NULL DEFAULT 0, is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL
    );
    CREATE TABLE IF NOT EXISTS public.categories (
      id text PRIMARY KEY, name text NOT NULL, type text NOT NULL, color text NOT NULL,
      is_default boolean NOT NULL DEFAULT false, budget numeric, created_at timestamptz NOT NULL,
      updated_at timestamptz
    );
    CREATE TABLE IF NOT EXISTS public.transactions (
      id text PRIMARY KEY, type text NOT NULL, amount numeric NOT NULL, category_id text NOT NULL DEFAULT '',
      description text NOT NULL, date date NOT NULL, notes text, tags jsonb,
      is_recurring boolean, recurring_day integer, recurring_id text,
      created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL,
      account_id text, from_account_id text, to_account_id text, notification_source jsonb
    );
    CREATE TABLE IF NOT EXISTS public.settings (
      id text PRIMARY KEY, currency text NOT NULL, theme text NOT NULL,
      monthly_savings_goal numeric NOT NULL DEFAULT 0, backup_interval text,
      last_backup_at timestamptz, reminder_enabled boolean, reminder_time text,
      updated_at timestamptz
    );
    CREATE SEQUENCE IF NOT EXISTS public.tracker_sync_version_v2_seq;
    CREATE TABLE IF NOT EXISTS public.tracker_sync_records_v2 (
      owner_id text NOT NULL,
      entity text NOT NULL CHECK (entity IN ('transactions','categories','accounts','settings')),
      record_id text NOT NULL,
      data jsonb,
      deleted boolean NOT NULL DEFAULT false,
      modified_at timestamptz NOT NULL,
      device_id uuid NOT NULL,
      version bigint NOT NULL DEFAULT nextval('public.tracker_sync_version_v2_seq'),
      PRIMARY KEY (owner_id, entity, record_id)
    );
    CREATE TABLE IF NOT EXISTS public.tracker_sync_operations_v2 (
      owner_id text NOT NULL,
      op_id uuid NOT NULL,
      processed_at timestamptz NOT NULL DEFAULT now()
      ,PRIMARY KEY (owner_id, op_id)
    );
    CREATE INDEX IF NOT EXISTS tracker_sync_records_v2_owner_version_idx ON public.tracker_sync_records_v2(owner_id, version);
  `)
  const count = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM public.tracker_sync_records_v2")
  if (Number(count.rows[0]?.count ?? 0) === 0) {
    const bootstrapDevice = "00000000-0000-0000-0000-000000000000"
    for (const entity of ["accounts", "categories", "transactions", "settings"] as const) {
      const records = await readMaterializedRecords(client, entity)
      for (const record of records) {
        const candidate = record.data.updatedAt ?? record.data.createdAt
        const modifiedAt = typeof candidate === "string" && !Number.isNaN(Date.parse(candidate)) ? candidate : new Date().toISOString()
        await client.query(
          `INSERT INTO public.tracker_sync_records_v2(owner_id, entity, record_id, data, deleted, modified_at, device_id)
           VALUES ($1, $2, $3, $4::jsonb, false, $5, $6) ON CONFLICT DO NOTHING`,
          [ownerId, entity, record.recordId, JSON.stringify(record.data), modifiedAt, bootstrapDevice],
        )
      }
    }
  }
}

function validateOperationData(operation: SyncOperation): Record<string, unknown> | null {
  if (operation.deleted) return null
  const result = entityDataSchemas[operation.entity].safeParse(operation.data)
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Invalid record data")
  return result.data as Record<string, unknown>
}

async function applyOperation(client: PoolClient, ownerId: string, deviceId: string, operation: SyncOperation): Promise<"accepted" | "duplicate" | "older"> {
  const duplicate = await client.query("SELECT 1 FROM public.tracker_sync_operations_v2 WHERE owner_id = $1 AND op_id = $2", [ownerId, operation.opId])
  if (duplicate.rowCount) return "duplicate"
  const data = validateOperationData(operation)
  const current = await client.query<{ modified_at: Date; device_id: string }>(
    "SELECT modified_at, device_id::text FROM public.tracker_sync_records_v2 WHERE owner_id = $1 AND entity = $2 AND record_id = $3 FOR UPDATE",
    [ownerId, operation.entity, operation.recordId],
  )
  const existing = current.rows[0]
  const incomingTime = new Date(operation.modifiedAt).getTime()
  if (existing && (existing.modified_at.getTime() > incomingTime ||
      (existing.modified_at.getTime() === incomingTime && existing.device_id.localeCompare(deviceId) > 0))) {
    await client.query("INSERT INTO public.tracker_sync_operations_v2(owner_id, op_id) VALUES ($1, $2)", [ownerId, operation.opId])
    return "older"
  }

  await materializeRecord(client, operation.entity, operation.recordId, data, operation.deleted, operation.modifiedAt)
  await client.query(
    `INSERT INTO public.tracker_sync_records_v2(owner_id, entity, record_id, data, deleted, modified_at, device_id)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
     ON CONFLICT (owner_id, entity, record_id) DO UPDATE SET
       data = EXCLUDED.data, deleted = EXCLUDED.deleted, modified_at = EXCLUDED.modified_at,
       device_id = EXCLUDED.device_id, version = nextval('public.tracker_sync_version_v2_seq')`,
    [ownerId, operation.entity, operation.recordId, data ? JSON.stringify(data) : null, operation.deleted, operation.modifiedAt, deviceId],
  )
  await client.query("INSERT INTO public.tracker_sync_operations_v2(owner_id, op_id) VALUES ($1, $2)", [ownerId, operation.opId])
  return "accepted"
}

export async function synchronize(ownerId: string, deviceId: string, cursor: number, operations: SyncOperation[]) {
  const client = await getPool().connect()
  const acknowledged: string[] = []
  const rejected: { opId: string; reason: string }[] = []
  try {
    await ensureSyncSchema(client, ownerId)
    for (const operation of operations) {
      try {
        await client.query("BEGIN")
        await applyOperation(client, ownerId, deviceId, operation)
        await client.query("COMMIT")
        acknowledged.push(operation.opId)
      } catch (error) {
        await client.query("ROLLBACK")
        rejected.push({ opId: operation.opId, reason: error instanceof Error ? error.message : "Database write failed" })
      }
    }
    const rows = await client.query<{
      entity: SyncChange["entity"]; record_id: string; data: Record<string, unknown> | null;
      deleted: boolean; modified_at: Date; version: string;
    }>(
      `SELECT entity, record_id, data, deleted, modified_at, version::text
       FROM public.tracker_sync_records_v2 WHERE owner_id = $1 AND version > $2 ORDER BY version ASC LIMIT 5000`, [ownerId, cursor]
    )
    const changes: SyncChange[] = rows.rows.map((row) => ({
      entity: row.entity, recordId: row.record_id, data: row.data, deleted: row.deleted,
      modifiedAt: row.modified_at.toISOString(), version: Number(row.version),
    }))
    const nextCursor = changes.at(-1)?.version ?? cursor
    return { cursor: nextCursor, changes, acknowledged, rejected }
  } finally {
    client.release()
  }
}

export async function databaseHealth() {
  const client = await getPool().connect()
  try {
    const server = await client.query<{ database: string; version: string }>("SELECT current_database() AS database, version() AS version")
    const tables = await inspectApplicationTables(client)
    return { connected: true, database: server.rows[0]?.database, version: server.rows[0]?.version, tables }
  } finally {
    client.release()
  }
}

import "server-only"
import type { PoolClient } from "pg"
import { getPool } from "./pool"
import { entityDataSchemas, type SyncChange, type SyncOperation } from "@/lib/sync/contracts"
import { inspectApplicationTables, materializeRecord, readMaterializedRecords } from "./materialize"

export async function ensureSyncSchema(client: PoolClient) {
  await client.query(`
    CREATE SEQUENCE IF NOT EXISTS public.tracker_sync_version_seq;
    CREATE TABLE IF NOT EXISTS public.tracker_sync_records (
      entity text NOT NULL CHECK (entity IN ('transactions','categories','accounts','settings')),
      record_id text NOT NULL,
      data jsonb,
      deleted boolean NOT NULL DEFAULT false,
      modified_at timestamptz NOT NULL,
      device_id uuid NOT NULL,
      version bigint NOT NULL DEFAULT nextval('public.tracker_sync_version_seq'),
      PRIMARY KEY (entity, record_id)
    );
    CREATE TABLE IF NOT EXISTS public.tracker_sync_operations (
      op_id uuid PRIMARY KEY,
      processed_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS tracker_sync_records_version_idx ON public.tracker_sync_records(version);
  `)
  const count = await client.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM public.tracker_sync_records")
  if (Number(count.rows[0]?.count ?? 0) === 0) {
    const bootstrapDevice = "00000000-0000-0000-0000-000000000000"
    for (const entity of ["accounts", "categories", "transactions", "settings"] as const) {
      const records = await readMaterializedRecords(client, entity)
      for (const record of records) {
        const candidate = record.data.updatedAt ?? record.data.createdAt
        const modifiedAt = typeof candidate === "string" && !Number.isNaN(Date.parse(candidate)) ? candidate : new Date().toISOString()
        await client.query(
          `INSERT INTO public.tracker_sync_records(entity, record_id, data, deleted, modified_at, device_id)
           VALUES ($1, $2, $3::jsonb, false, $4, $5) ON CONFLICT DO NOTHING`,
          [entity, record.recordId, JSON.stringify(record.data), modifiedAt, bootstrapDevice],
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

async function applyOperation(client: PoolClient, deviceId: string, operation: SyncOperation): Promise<"accepted" | "duplicate" | "older"> {
  const duplicate = await client.query("SELECT 1 FROM public.tracker_sync_operations WHERE op_id = $1", [operation.opId])
  if (duplicate.rowCount) return "duplicate"
  const data = validateOperationData(operation)
  const current = await client.query<{ modified_at: Date; device_id: string }>(
    "SELECT modified_at, device_id::text FROM public.tracker_sync_records WHERE entity = $1 AND record_id = $2 FOR UPDATE",
    [operation.entity, operation.recordId],
  )
  const existing = current.rows[0]
  const incomingTime = new Date(operation.modifiedAt).getTime()
  if (existing && (existing.modified_at.getTime() > incomingTime ||
      (existing.modified_at.getTime() === incomingTime && existing.device_id.localeCompare(deviceId) > 0))) {
    await client.query("INSERT INTO public.tracker_sync_operations(op_id) VALUES ($1)", [operation.opId])
    return "older"
  }

  await materializeRecord(client, operation.entity, operation.recordId, data, operation.deleted, operation.modifiedAt)
  await client.query(
    `INSERT INTO public.tracker_sync_records(entity, record_id, data, deleted, modified_at, device_id)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6)
     ON CONFLICT (entity, record_id) DO UPDATE SET
       data = EXCLUDED.data, deleted = EXCLUDED.deleted, modified_at = EXCLUDED.modified_at,
       device_id = EXCLUDED.device_id, version = nextval('public.tracker_sync_version_seq')`,
    [operation.entity, operation.recordId, data ? JSON.stringify(data) : null, operation.deleted, operation.modifiedAt, deviceId],
  )
  await client.query("INSERT INTO public.tracker_sync_operations(op_id) VALUES ($1)", [operation.opId])
  return "accepted"
}

export async function synchronize(deviceId: string, cursor: number, operations: SyncOperation[]) {
  const client = await getPool().connect()
  const acknowledged: string[] = []
  const rejected: { opId: string; reason: string }[] = []
  try {
    await ensureSyncSchema(client)
    for (const operation of operations) {
      try {
        await client.query("BEGIN")
        await applyOperation(client, deviceId, operation)
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
       FROM public.tracker_sync_records WHERE version > $1 ORDER BY version ASC LIMIT 5000`, [cursor]
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

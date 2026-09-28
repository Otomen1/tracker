"use client"

import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS, STORAGE_KEYS } from "@/lib/constants"
import { syncResponseSchema, type SyncChange, type SyncEntity, type SyncOperation } from "./contracts"

export type SyncStatus = "disabled" | "synced" | "syncing" | "pending" | "offline" | "error"

type RecordMeta = { hash: string; modifiedAt: string; deleted: boolean }
export type StoredSyncState = {
  deviceId: string
  cursor: number
  initialized: boolean
  lastSuccessfulSync?: string
  lastAttempt?: string
  lastError?: string
  queue: SyncOperation[]
  records: Record<SyncEntity, Record<string, RecordMeta>>
}

const SAME_TAB_EVENT = "tracker-storage-change"
const ENTITIES: SyncEntity[] = ["accounts", "categories", "transactions", "settings"]
const KEY_BY_ENTITY: Record<SyncEntity, string> = {
  transactions: STORAGE_KEYS.TRANSACTIONS,
  categories: STORAGE_KEYS.CATEGORIES,
  accounts: STORAGE_KEYS.ACCOUNTS,
  settings: STORAGE_KEYS.SETTINGS,
}

function emptyRecords(): StoredSyncState["records"] {
  return { transactions: {}, categories: {}, accounts: {}, settings: {} }
}

export function isSyncSupported(): boolean {
  if (typeof window === "undefined") return false
  const capacitor = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return window.location.protocol.startsWith("http") && !capacitor?.isNativePlatform?.()
}

export function readSyncState(): StoredSyncState {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.SYNC_STATE) ?? "null") as Partial<StoredSyncState> | null
    if (parsed?.deviceId) {
      return {
        deviceId: parsed.deviceId,
        cursor: Number.isSafeInteger(parsed.cursor) ? parsed.cursor! : 0,
        initialized: Boolean(parsed.initialized),
        lastSuccessfulSync: parsed.lastSuccessfulSync,
        lastAttempt: parsed.lastAttempt,
        lastError: parsed.lastError,
        queue: Array.isArray(parsed.queue) ? parsed.queue : [],
        records: { ...emptyRecords(), ...parsed.records },
      }
    }
  } catch { /* start with a clean sync envelope; application data is untouched */ }
  return { deviceId: crypto.randomUUID(), cursor: 0, initialized: false, queue: [], records: emptyRecords() }
}

export function writeSyncState(state: StoredSyncState) {
  localStorage.setItem(STORAGE_KEYS.SYNC_STATE, JSON.stringify(state))
}

function stableString(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableString).join(",")}]`
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stableString(item)}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function stable(value: unknown): string {
  const input = stableString(value)
  let hash = 0x811c9dc5
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, "0")
}

function recordMap(entity: SyncEntity): Map<string, Record<string, unknown>> {
  let value: unknown
  try {
    const raw = localStorage.getItem(KEY_BY_ENTITY[entity])
    if (entity === "settings") value = raw ? JSON.parse(raw) : DEFAULT_SETTINGS
    else if (entity === "categories") value = raw ? JSON.parse(raw) : DEFAULT_CATEGORIES
    else value = raw ? JSON.parse(raw) : []
  } catch {
    return new Map()
  }
  if (entity === "settings") return new Map([["singleton", value as Record<string, unknown>]])
  if (!Array.isArray(value)) return new Map()
  return new Map(value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && typeof item.id === "string")).map((item) => [String(item.id), item]))
}

function sourceTimestamp(entity: SyncEntity, record: Record<string, unknown>, fallback: string) {
  if (entity === "transactions" || entity === "accounts") return typeof record.updatedAt === "string" ? record.updatedAt : fallback
  if (entity === "categories") return typeof record.createdAt === "string" ? record.createdAt : fallback
  return fallback
}

function replaceQueuedOperation(queue: SyncOperation[], next: SyncOperation) {
  return [...queue.filter((item) => item.entity !== next.entity || item.recordId !== next.recordId), next]
}

export function scanLocalChanges(state: StoredSyncState, now = new Date().toISOString()): StoredSyncState {
  let queue = state.queue
  const records = structuredClone(state.records)
  for (const entity of ENTITIES) {
    const current = recordMap(entity)
    const metadata = records[entity]
    for (const [recordId, record] of Array.from(current.entries())) {
      const hash = stable(record)
      const previous = metadata[recordId]
      if (!previous || previous.deleted || previous.hash !== hash) {
        const modifiedAt = previous ? now : sourceTimestamp(entity, record, now)
        const operation: SyncOperation = { opId: crypto.randomUUID(), entity, recordId, modifiedAt, deleted: false, data: record }
        queue = replaceQueuedOperation(queue, operation)
        metadata[recordId] = { hash, modifiedAt, deleted: false }
      }
    }
    for (const [recordId, previous] of Object.entries(metadata)) {
      if (!previous.deleted && !current.has(recordId)) {
        const operation: SyncOperation = { opId: crypto.randomUUID(), entity, recordId, modifiedAt: now, deleted: true, data: null }
        queue = replaceQueuedOperation(queue, operation)
        metadata[recordId] = { hash: "", modifiedAt: now, deleted: true }
      }
    }
  }
  return { ...state, initialized: true, queue, records }
}

function applyEntityChanges(entity: SyncEntity, changes: SyncChange[], state: StoredSyncState) {
  const current = recordMap(entity)
  let changed = false
  for (const change of changes) {
    const pending = state.queue.find((item) => item.entity === entity && item.recordId === change.recordId)
    if (pending && new Date(pending.modifiedAt).getTime() > new Date(change.modifiedAt).getTime()) continue
    if (change.deleted) current.delete(change.recordId)
    else if (change.data) current.set(change.recordId, change.data)
    state.records[entity][change.recordId] = {
      hash: change.deleted ? "" : stable(change.data), modifiedAt: change.modifiedAt, deleted: change.deleted,
    }
    changed = true
  }
  if (!changed) return
  const value = entity === "settings" ? (current.get("singleton") ?? DEFAULT_SETTINGS) : Array.from(current.values())
  const serialized = JSON.stringify(value)
  localStorage.setItem(KEY_BY_ENTITY[entity], serialized)
  window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: { key: KEY_BY_ENTITY[entity], value: serialized } }))
}

export async function performSync(input: StoredSyncState): Promise<StoredSyncState> {
  let state = scanLocalChanges(input)
  state.lastAttempt = new Date().toISOString()
  writeSyncState(state)
  const response = await fetch("/api/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({ deviceId: state.deviceId, cursor: state.cursor, operations: state.queue }),
  })
  if (!response.ok) throw new Error(response.status === 503 ? "PostgreSQL is unavailable" : `Sync request failed (${response.status})`)
  const parsed = syncResponseSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error("The sync server returned an invalid response")
  const acknowledged = new Set(parsed.data.acknowledged)
  state.queue = state.queue.filter((operation) => !acknowledged.has(operation.opId))
  for (const entity of ENTITIES) applyEntityChanges(entity, parsed.data.changes.filter((change) => change.entity === entity), state)
  state.cursor = parsed.data.cursor
  state.lastSuccessfulSync = new Date().toISOString()
  state.lastError = parsed.data.rejected[0]?.reason
  writeSyncState(state)
  return state
}

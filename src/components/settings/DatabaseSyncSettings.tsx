"use client"

import { useSync } from "@/context/SyncContext"
import { Button } from "@/components/ui/button"

const TEXT = {
  disabled: "Synchronization is unavailable in this static or Android build.",
  synced: "Local data and PostgreSQL are synchronized.",
  syncing: "Synchronizing local changes…",
  pending: "Local changes are waiting to synchronize.",
  offline: "PostgreSQL is offline. Tracker will keep saving locally.",
  error: "The last synchronization could not be completed.",
} as const

export function DatabaseSyncSettings() {
  const { status, pendingCount, lastSuccessfulSync, lastError, syncNow } = useSync()
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">{TEXT[status]}</p>
        <div className="mt-1 space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          <p>Pending changes: {pendingCount}</p>
          <p>Last synced: {lastSuccessfulSync ? new Date(lastSuccessfulSync).toLocaleString() : "Never"}</p>
          {lastError && <p className="text-amber-600 dark:text-amber-400">{lastError}</p>}
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={status === "disabled" || status === "syncing"} onClick={() => void syncNow()}>
        {status === "syncing" ? "Syncing…" : "Sync now"}
      </Button>
    </div>
  )
}

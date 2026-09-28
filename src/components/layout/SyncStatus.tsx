"use client"

import { Cloud, CloudOff, LoaderCircle, RefreshCw } from "lucide-react"
import { useSync } from "@/context/SyncContext"

const LABELS = { disabled: "Local only", signed_out: "Sign in to sync", synced: "Synced", syncing: "Syncing", pending: "Sync pending", offline: "Database offline", error: "Sync error" } as const

export function SyncStatus() {
  const { status, pendingCount, syncNow } = useSync()
  if (status === "disabled") return null
  const Icon = status === "syncing" ? LoaderCircle : status === "offline" || status === "error" || status === "signed_out" ? CloudOff : status === "pending" ? RefreshCw : Cloud
  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      className="fixed right-3 top-3 z-40 flex min-h-9 items-center gap-1.5 rounded-full border border-zinc-200 bg-white/95 px-3 text-xs font-medium text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 dark:text-zinc-300 lg:right-5"
      title="Synchronize with local PostgreSQL"
    >
      <Icon className={`h-3.5 w-3.5 ${status === "syncing" ? "animate-spin" : ""}`} />
      <span>{LABELS[status]}{pendingCount ? ` (${pendingCount})` : ""}</span>
    </button>
  )
}

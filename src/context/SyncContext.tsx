"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { isSyncSupported, performSync, readSyncState, scanLocalChanges, writeSyncState, type StoredSyncState, type SyncStatus } from "@/lib/sync/client"

type SyncContextValue = {
  status: SyncStatus
  pendingCount: number
  lastSuccessfulSync?: string
  lastError?: string
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue>({ status: "disabled", pendingCount: 0, syncNow: async () => {} })
const SAME_TAB_EVENT = "tracker-storage-change"

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const stateRef = useRef<StoredSyncState | null>(null)
  const runningRef = useRef<Promise<void> | null>(null)
  const [view, setView] = useState<Omit<SyncContextValue, "syncNow">>({ status: "disabled", pendingCount: 0 })

  const publish = useCallback((state: StoredSyncState, status?: SyncStatus) => {
    setView({
      status: status ?? (state.queue.length ? "pending" : "synced"),
      pendingCount: state.queue.length,
      lastSuccessfulSync: state.lastSuccessfulSync,
      lastError: state.lastError,
    })
  }, [])

  const syncNow = useCallback(async () => {
    if (!isSyncSupported()) return
    if (runningRef.current) return runningRef.current
    const task = (async () => {
      const execute = async () => {
      const scanned = scanLocalChanges(readSyncState())
      stateRef.current = scanned
      writeSyncState(scanned)
      publish(scanned, "syncing")
      try {
        const next = await performSync(scanned)
        stateRef.current = next
        publish(next, next.lastError ? "error" : undefined)
      } catch (error) {
        const next = stateRef.current ?? scanned
        next.lastError = error instanceof Error ? error.message : "Synchronization failed"
        writeSyncState(next)
        stateRef.current = next
        publish(next, next.lastError.includes("unavailable") || !navigator.onLine ? "offline" : "error")
      }
      }
      if ("locks" in navigator) await navigator.locks.request("tracker-postgres-sync", { mode: "exclusive" }, execute)
      else await execute()
    })().finally(() => { runningRef.current = null })
    runningRef.current = task
    return task
  }, [publish])

  useEffect(() => {
    if (!isSyncSupported()) return
    const initial = scanLocalChanges(readSyncState())
    stateRef.current = initial
    writeSyncState(initial)
    publish(initial, initial.queue.length ? "pending" : "synced")
    void syncNow()

    let timer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      clearTimeout(timer)
      const next = scanLocalChanges(stateRef.current ?? readSyncState())
      stateRef.current = next
      writeSyncState(next)
      publish(next, "pending")
      timer = setTimeout(() => void syncNow(), 750)
    }
    const onVisible = () => { if (document.visibilityState === "visible") void syncNow() }
    window.addEventListener(SAME_TAB_EVENT, schedule)
    window.addEventListener("storage", schedule)
    window.addEventListener("online", syncNow)
    window.addEventListener("focus", syncNow)
    document.addEventListener("visibilitychange", onVisible)
    const interval = window.setInterval(() => void syncNow(), 60_000)
    return () => {
      clearTimeout(timer)
      clearInterval(interval)
      window.removeEventListener(SAME_TAB_EVENT, schedule)
      window.removeEventListener("storage", schedule)
      window.removeEventListener("online", syncNow)
      window.removeEventListener("focus", syncNow)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [publish, syncNow])

  return <SyncContext.Provider value={{ ...view, syncNow }}>{children}</SyncContext.Provider>
}

export function useSync() { return useContext(SyncContext) }

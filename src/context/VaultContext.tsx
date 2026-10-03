"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { validateEntry } from "@/domain/finance"
import { nativeVault } from "@/lib/nativeVault"
import {
  SENSITIVE_LEGACY_KEYS,
  emptyVault,
  hasWebRecovery,
  readLegacyVault,
  restoreWebRecovery,
  validateVault,
  writeWebVault,
  type VaultData,
} from "@/lib/vault/schema"

const VAULT_CHANGED_EVENT = "tracker-vault-change"
const MIGRATION_MARKER = "tracker_vault_migration"
const MIGRATION_PENDING = "verified-pending-cleanup"
const MIGRATION_COMPLETE = "complete"

type VaultMutation = (current: VaultData) => VaultData

interface VaultContextValue {
  data: VaultData
  ready: boolean
  unlocked: boolean
  error: string | null
  hasRecovery: boolean
  migrationPending: boolean
  unlock: () => Promise<boolean>
  lock: () => Promise<void>
  mutate: (mutation: VaultMutation) => Promise<boolean>
  replace: (next: VaultData) => Promise<boolean>
  restoreMigration: () => Promise<boolean>
  restorePrevious: () => Promise<boolean>
  eraseAll: () => Promise<void>
}

const VaultContext = createContext<VaultContextValue | null>(null)

function comparable(vault: VaultData) {
  return {
    transactions: vault.transactions,
    categories: vault.categories,
    accounts: vault.accounts,
    settings: vault.settings,
    androidSetupComplete: vault.androidSetupComplete,
  }
}

function samePayload(left: VaultData, right: VaultData) {
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right))
}

function cleanupLegacyStorage() {
  for (const key of SENSITIVE_LEGACY_KEYS) localStorage.removeItem(key)
  localStorage.setItem(MIGRATION_MARKER, MIGRATION_COMPLETE)
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const initial = useMemo(() => emptyVault(), [])
  const [data, setData] = useState(initial)
  const [ready, setReady] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRecovery, setHasRecovery] = useState(false)
  const [migrationPending, setMigrationPending] = useState(false)
  const currentRef = useRef<VaultData>(initial)
  const queueRef = useRef<Promise<unknown>>(Promise.resolve())

  const enqueue = useCallback(<T,>(action: () => Promise<T>): Promise<T> => {
    const task = queueRef.current.then(action)
    queueRef.current = task.then(() => undefined, () => undefined)
    return task
  }, [])

  const publish = useCallback((next: VaultData) => {
    currentRef.current = next
    setData(next)
    window.dispatchEvent(new CustomEvent(VAULT_CHANGED_EVENT))
  }, [])

  const loadWebVault = useCallback(() => {
    const next = readLegacyVault(localStorage)
    const recoverable = hasWebRecovery(localStorage)
    currentRef.current = next
    setData(next)
    setUnlocked(true)
    setReady(true)
    setHasRecovery(recoverable)
    setError(recoverable ? "A browser write was interrupted. You can restore the previous snapshot." : null)
  }, [])

  useEffect(() => {
    if (nativeVault.isNative()) {
      void nativeVault.status().then((status) => {
        setHasRecovery(status.hasRecovery)
        setMigrationPending(localStorage.getItem(MIGRATION_MARKER) === MIGRATION_PENDING)
        setReady(true)
      }).catch((reason) => {
        setError(reason instanceof Error ? reason.message : "Secure storage is unavailable")
        setReady(true)
      })
      return
    }

    try { loadWebVault() } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Saved data could not be read")
      setUnlocked(true)
      setHasRecovery(hasWebRecovery(localStorage))
      setReady(true)
    }

    const reload = () => {
      try { loadWebVault() } catch { /* keep the last validated in-memory snapshot */ }
    }
    window.addEventListener("storage", reload)
    window.addEventListener(VAULT_CHANGED_EVENT, reload)
    return () => {
      window.removeEventListener("storage", reload)
      window.removeEventListener(VAULT_CHANGED_EVENT, reload)
    }
  }, [loadWebVault])

  const unlock = useCallback(async () => {
    setError(null)
    if (!nativeVault.isNative()) {
      loadWebVault()
      return true
    }

    try {
      if (!await nativeVault.unlock()) return false
      const status = await nativeVault.status()
      let next: VaultData
      if (status.exists) {
        next = validateVault(await nativeVault.read())
        if (localStorage.getItem(MIGRATION_MARKER) === MIGRATION_PENDING) {
          cleanupLegacyStorage()
          setMigrationPending(false)
        }
      } else {
        const legacy = readLegacyVault(localStorage)
        next = validateVault(await nativeVault.initialize(legacy))
        if (!samePayload(legacy, next)) throw new Error("Secure migration verification failed; original data was kept")
        localStorage.setItem(MIGRATION_MARKER, MIGRATION_PENDING)
        setMigrationPending(true)
      }
      publish(next)
      setHasRecovery((await nativeVault.status()).hasRecovery)
      setUnlocked(true)
      setReady(true)
      return true
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "The encrypted vault could not be unlocked"
      await nativeVault.lock().catch(() => undefined)
      setError(message)
      setUnlocked(false)
      throw new Error(message)
    }
  }, [loadWebVault, publish])

  const lock = useCallback(async () => {
    if (!nativeVault.isNative()) return
    await nativeVault.lock()
    const cleared = emptyVault()
    currentRef.current = cleared
    setData(cleared)
    setUnlocked(false)
  }, [])

  const persist = useCallback(async (candidate: VaultData, expectedRevision: number, restoring = false) => {
    const validated = validateVault(candidate)
    if (nativeVault.isNative()) return validateVault(await nativeVault.write(validated, expectedRevision, restoring))
    const next = validateVault({ ...validated, revision: expectedRevision + 1, updatedAt: new Date().toISOString() })
    writeWebVault(localStorage, next)
    return next
  }, [])

  const mutate = useCallback((mutation: VaultMutation, validateChanges = true): Promise<boolean> => {
    const task = queueRef.current.then(async () => {
      const commit = async () => {
        if (nativeVault.isNative() && !unlocked) return false
        try {
          // A browser tab may have committed after this provider last rendered.
          // Re-read while holding the cross-tab Web Locks mutex before applying
          // the caller's mutation so concurrent tabs do not overwrite records.
          const current = nativeVault.isNative() ? currentRef.current : readLegacyVault(localStorage)
          const proposed = mutation(structuredClone(current))
          const previousById = new Map(current.transactions.map(item => [item.id, item]))
          for (const item of validateChanges ? proposed.transactions : []) {
            const previous = previousById.get(item.id)
            if (JSON.stringify(previous) !== JSON.stringify(item)) validateEntry(item, proposed.accounts, proposed.categories, previous)
          }
          for (const category of validateChanges ? proposed.categories : []) {
            const old = current.categories.find(c => c.id === category.id)
            if (old && old.type !== category.type && current.transactions.some(t => t.categoryId === category.id)) throw new Error("A category with history cannot change type.")
          }
          for (const old of validateChanges ? current.categories : []) {
            if (!proposed.categories.some(c => c.id === old.id) && proposed.transactions.some(t => t.categoryId === old.id)) throw new Error("Category is used by existing transactions.")
          }
          for (const account of validateChanges ? proposed.accounts : []) {
            const old = current.accounts.find(a => a.id === account.id)
            if (old?.isActive && !account.isActive && proposed.transactions.some(t => t.isRecurring && !t.recurringId && [t.accountId, t.fromAccountId, t.toAccountId].includes(account.id))) throw new Error("Turn off recurring entries for this account before archiving it.")
            if (old && (old.currency !== account.currency || (old.kind ?? "bank") !== (account.kind ?? "bank")) && current.transactions.some(t => [t.accountId, t.fromAccountId, t.toAccountId].includes(account.id))) throw new Error("An account with history cannot change currency or kind.")
          }
          if (samePayload(current, proposed)) return true
          const next = await persist({ ...proposed, revision: current.revision }, current.revision, !validateChanges)
          publish(next)
          setError(null)
          setHasRecovery(nativeVault.isNative())
          return true
        } catch (reason) {
          setError(reason instanceof Error ? reason.message : "Secure storage write failed")
          if (nativeVault.isNative()) {
            const status = await nativeVault.status().catch(() => null)
            if (status) setHasRecovery(status.hasRecovery)
          } else {
            setHasRecovery(hasWebRecovery(localStorage))
          }
          const quotaExceeded = reason instanceof DOMException && reason.name === "QuotaExceededError"
          window.dispatchEvent(new CustomEvent(quotaExceeded ? "storage-quota-exceeded" : "storage-write-failed"))
          return false
        }
      }

      if (!nativeVault.isNative() && typeof navigator !== "undefined" && "locks" in navigator) {
        return navigator.locks.request("tracker-vault", { mode: "exclusive" }, commit)
      }
      return commit()
    })
    queueRef.current = task.then(() => undefined, () => undefined)
    return task
  }, [persist, publish, unlocked])

  const replace = useCallback((next: VaultData) => mutate(() => validateVault({
    ...next,
    revision: currentRef.current.revision,
    updatedAt: new Date().toISOString(),
  }), false), [mutate])

  const restorePrevious = useCallback(() => enqueue(async () => {
    try {
      const next = nativeVault.isNative()
        ? validateVault(await nativeVault.restorePrevious())
        : restoreWebRecovery(localStorage)
      publish(next)
      setError(null)
      setHasRecovery(false)
      setUnlocked(true)
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Recovery snapshot could not be restored")
      return false
    }
  }), [publish, enqueue])

  const restoreMigration = useCallback((): Promise<boolean> => {
    const task = queueRef.current.then(async () => {
      try {
        const next = validateVault(await nativeVault.restoreMigration())
        publish(next); setError(null); setUnlocked(true)
        return true
      } catch (reason) { setError(reason instanceof Error ? reason.message : "Pre-upgrade snapshot is unavailable"); return false }
    })
    queueRef.current = task.then(() => undefined, () => undefined)
    return task
  }, [publish])

  const eraseAll = useCallback(() => enqueue(async () => {
    if (nativeVault.isNative()) await nativeVault.erase()
    for (const key of Object.keys(localStorage).filter((key) => key.startsWith("tracker_"))) localStorage.removeItem(key)
    localStorage.removeItem("theme")
    const cleared = emptyVault()
    currentRef.current = cleared
    setData(cleared)
    setUnlocked(!nativeVault.isNative())
    setHasRecovery(false)
    setMigrationPending(false)
    setError(null)
  }), [enqueue])

  const value = useMemo<VaultContextValue>(() => ({
    data, ready, unlocked, error, hasRecovery, migrationPending, unlock, lock, mutate, replace, restorePrevious, restoreMigration, eraseAll,
  }), [data, ready, unlocked, error, hasRecovery, migrationPending, unlock, lock, mutate, replace, restorePrevious, restoreMigration, eraseAll])

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export function useVault() {
  const context = useContext(VaultContext)
  if (!context) throw new Error("useVault must be used within VaultProvider")
  return context
}

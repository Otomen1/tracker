"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LockKeyhole, RotateCcw } from "lucide-react"
import { useVault } from "@/context/VaultContext"
import { nativeVault } from "@/lib/nativeVault"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/hooks/useHydrated"

const LOCK_AFTER_MS = 30 * 1000

export function AppLock() {
  const { ready, unlocked, error, hasRecovery, unlock: unlockVault, lock, restorePrevious } = useVault()
  const hydrated = useHydrated()
  const isNative = hydrated && nativeVault.isNative()
  const [prompting, setPrompting] = useState(false)
  const [recovering, setRecovering] = useState(false)
  const [message, setMessage] = useState("")
  const backgroundedAt = useRef<number | null>(null)
  const promptInFlight = useRef(false)
  const autoPrompted = useRef(false)

  const unlock = useCallback(async () => {
    if (promptInFlight.current) return
    promptInFlight.current = true
    setPrompting(true)
    setMessage("")
    try {
      await unlockVault()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication was cancelled.")
    } finally {
      promptInFlight.current = false
      setPrompting(false)
    }
  }, [unlockVault])

  useEffect(() => {
    if (!isNative || !ready || unlocked || autoPrompted.current) return
    autoPrompted.current = true
    const timer = window.setTimeout(() => void unlock(), 350)
    return () => window.clearTimeout(timer)
  }, [isNative, ready, unlock, unlocked])

  useEffect(() => {
    if (!isNative) return
    const onVisibility = async () => {
      if (document.visibilityState === "hidden") backgroundedAt.current = Date.now()
      if (document.visibilityState !== "visible") return

      const nativeSession = await nativeVault.status().catch(() => null)
      const timedOut = Boolean(backgroundedAt.current && Date.now() - backgroundedAt.current >= LOCK_AFTER_MS)
      if (timedOut || nativeSession?.unlocked === false) {
        await lock()
        autoPrompted.current = true
        window.setTimeout(() => void unlock(), 250)
      }
    }
    const onLockNow = () => {
      autoPrompted.current = true
      void lock()
    }
    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("tracker-lock-now", onLockNow)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("tracker-lock-now", onLockNow)
    }
  }, [isNative, lock, unlock])

  const recover = async () => {
    setRecovering(true)
    setMessage("")
    try {
      if (!await nativeVault.unlock()) {
        setMessage("Authentication was cancelled.")
        return
      }
      if (!await restorePrevious()) setMessage("The encrypted recovery snapshot could not be restored.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The encrypted recovery snapshot could not be restored.")
    } finally {
      setRecovering(false)
    }
  }

  if (!isNative || unlocked) return null
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950 p-6 text-center text-white">
      <div className="max-w-sm">
        <LockKeyhole className="mx-auto h-12 w-12" />
        <h1 className="mt-5 text-2xl font-bold">Tracker is locked</h1>
        <p className="mt-2 text-sm text-zinc-400">Use your fingerprint or device PIN to unlock the encrypted vault.</p>
        {(message || error) && <p className="mt-4 text-sm text-rose-300" role="alert">{message || error}</p>}
        <div className="mt-6 flex flex-col gap-2">
          <Button className="bg-white text-zinc-950 hover:bg-zinc-200" disabled={prompting || recovering || !ready} onClick={() => void unlock()}>
            {prompting ? "Unlocking…" : "Unlock Tracker"}
          </Button>
          {hasRecovery && (
            <Button variant="outline" className="gap-2 border-zinc-700 bg-transparent text-white hover:bg-zinc-900" disabled={prompting || recovering} onClick={() => void recover()}>
              <RotateCcw className="h-4 w-4" />{recovering ? "Restoring…" : "Restore previous encrypted data"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

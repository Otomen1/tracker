"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { LockKeyhole } from "lucide-react"
import { useAccounts } from "@/context/AccountsContext"
import { nativeCapture } from "@/lib/nativeCapture"
import { Button } from "@/components/ui/button"
import { useHydrated } from "@/hooks/useHydrated"

const LOCK_AFTER_MS = 2 * 60 * 1000

export function AppLock() {
  const { androidSetupComplete } = useAccounts()
  const hydrated = useHydrated()
  const isNative = hydrated && nativeCapture.isNative()
  const [locked, setLocked] = useState(false)
  const [message, setMessage] = useState("")
  const backgroundedAt = useRef<number | null>(null)

  const unlock = useCallback(async () => {
    setMessage("")
    try {
      if (await nativeCapture.authenticate()) setLocked(false)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication was cancelled.")
    }
  }, [])

  useEffect(() => {
    if (!isNative || !androidSetupComplete) return
    setLocked(true)
    const timer = window.setTimeout(() => void unlock(), 350)
    const onVisibility = () => {
      if (document.visibilityState === "hidden") backgroundedAt.current = Date.now()
      if (document.visibilityState === "visible" && backgroundedAt.current && Date.now() - backgroundedAt.current >= LOCK_AFTER_MS) {
        setLocked(true)
        window.setTimeout(() => void unlock(), 250)
      }
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [androidSetupComplete, isNative, unlock])

  if (!isNative || !androidSetupComplete || !locked) return null
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950 p-6 text-center text-white">
      <div className="max-w-sm"><LockKeyhole className="mx-auto h-12 w-12" /><h1 className="mt-5 text-2xl font-bold">Tracker is locked</h1><p className="mt-2 text-sm text-zinc-400">Use your Pixel fingerprint or PIN to view financial data.</p>{message && <p className="mt-4 text-sm text-rose-300" role="alert">{message}</p>}<Button className="mt-6 bg-white text-zinc-950 hover:bg-zinc-200" onClick={() => void unlock()}>Unlock Tracker</Button></div>
    </div>
  )
}

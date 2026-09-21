"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { nativeCapture } from "@/lib/nativeCapture"
import { PendingTransaction } from "@/types"

interface ReviewInboxContextValue {
  items: PendingTransaction[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  discard: (id: string) => Promise<void>
  resolve: (id: string) => Promise<void>
}

const ReviewInboxContext = createContext<ReviewInboxContextValue | null>(null)

export function ReviewInboxProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PendingTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { const result = await nativeCapture.listPending(); setItems(result.items); setError(result.error ?? null) } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    void refresh()
    const onFocus = () => void refresh()
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh() }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [refresh])

  const discard = useCallback(async (id: string) => {
    await nativeCapture.discardPending(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const value = useMemo(() => ({ items, loading, error, refresh, discard, resolve: discard }), [items, loading, error, refresh, discard])
  return <ReviewInboxContext.Provider value={value}>{children}</ReviewInboxContext.Provider>
}

export function useReviewInbox() {
  const context = useContext(ReviewInboxContext)
  if (!context) throw new Error("useReviewInbox must be used within ReviewInboxProvider")
  return context
}

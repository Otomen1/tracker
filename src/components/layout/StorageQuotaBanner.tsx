"use client"

import { useState, useEffect } from "react"
import { AlertTriangle, X } from "lucide-react"

export function StorageQuotaBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = () => setVisible(true)
    window.addEventListener("storageQuotaExceeded", handler)
    return () => window.removeEventListener("storageQuotaExceeded", handler)
  }, [])

  if (!visible) return null

  return (
    <div role="alert" className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-rose-600 text-white px-4 py-2.5 text-sm shadow-lg">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1">Storage is full — some data may not have been saved. Free up space and try again.</span>
      <button
        type="button"
        onClick={() => setVisible(false)}
        className="p-1 rounded hover:bg-rose-700 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

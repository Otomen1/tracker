"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getStorageHealth, restoreRecoverySnapshot } from "@/lib/storage"

export function StorageRecoveryBanner() {
  const [health, setHealth] = useState<{ healthy: boolean; hasRecovery: boolean } | null>(null)
  const [restoreFailed, setRestoreFailed] = useState(false)

  useEffect(() => {
    const result = getStorageHealth()
    setHealth({ healthy: result.healthy, hasRecovery: result.hasRecovery })
  }, [])

  if (!health || health.healthy) return null

  const restore = () => {
    if (!restoreRecoverySnapshot()) {
      setRestoreFailed(true)
      return
    }
    window.location.reload()
  }

  return (
    <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Some saved data could not be read</p>
          <p className="text-xs opacity-80">{restoreFailed ? "The recovery snapshot could not be restored." : "The app stopped before changing it. Restore your last snapshot or review Data & Backup."}</p>
        </div>
        <div className="flex gap-2">
          {health.hasRecovery && <Button size="sm" variant="outline" className="gap-1.5" onClick={restore}><RotateCcw className="h-4 w-4" />Restore previous data</Button>}
          <Button size="sm" asChild><Link href="/settings#data-backup">Data settings</Link></Button>
        </div>
      </div>
    </div>
  )
}

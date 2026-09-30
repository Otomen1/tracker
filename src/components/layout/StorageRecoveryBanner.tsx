"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useVault } from "@/context/VaultContext"

export function StorageRecoveryBanner() {
  const vault = useVault()
  const [restoreFailed, setRestoreFailed] = useState(false)

  if (!vault.error || !vault.unlocked) return null

  const restore = async () => {
    if (!await vault.restorePrevious()) {
      setRestoreFailed(true)
      return
    }
  }

  return (
    <div role="alert" className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold">Some saved data could not be read</p>
          <p className="text-xs opacity-80">{restoreFailed ? "The recovery snapshot could not be restored." : vault.error}</p>
        </div>
        <div className="flex gap-2">
          {vault.hasRecovery && <Button size="sm" variant="outline" className="gap-1.5" onClick={() => void restore()}><RotateCcw className="h-4 w-4" />Restore previous data</Button>}
          <Button size="sm" asChild><Link href="/settings#data-backup">Data settings</Link></Button>
        </div>
      </div>
    </div>
  )
}

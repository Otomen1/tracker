"use client"

import { useState } from "react"
import { AlertTriangle, CheckCircle, LockKeyhole, ShieldCheck, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog"
import { useVault } from "@/context/VaultContext"
import { useHydrated } from "@/hooks/useHydrated"
import { nativeVault } from "@/lib/nativeVault"

type Status = { type: "success" | "error"; message: string }

export function LocalSecuritySettings() {
  const { lock, eraseAll, migrationPending } = useVault()
  const hydrated = useHydrated()
  const isNative = hydrated && nativeVault.isNative()
  const [confirmErase, setConfirmErase] = useState(false)
  const [erasing, setErasing] = useState(false)
  const [status, setStatus] = useState<Status | null>(null)

  const erase = async () => {
    setErasing(true)
    setStatus(null)
    try {
      if (isNative && !await nativeVault.unlock()) throw new Error("Authentication was cancelled")
      await eraseAll()
      setConfirmErase(false)
      setStatus({ type: "success", message: "All Tracker data on this device was erased." })
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Local data could not be erased." })
    } finally {
      setErasing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-3 ${isNative ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40" : "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40"}`}>
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-950 dark:text-zinc-100">
          {isNative ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
          {isNative ? "Encrypted local vault is active" : "Local browser storage"}
        </p>
        <p className="mt-1 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
          {isNative
            ? "Financial records are encrypted with AES-256-GCM in private app storage. The key is protected by your device PIN or biometrics and is removed from memory when Tracker locks."
            : "This web version keeps records on this browser only, but browser storage is not encrypted by Tracker. Use a device login and full-disk encryption, or use the Android APK for the encrypted vault."}
        </p>
      </div>

      {isNative && migrationPending && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Your encrypted migration was verified. Use <strong>Lock now</strong> and unlock once more to verify the vault after a fresh open and remove the protected legacy copy.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {isNative && (
          <Button variant="outline" className="min-h-11 gap-2" onClick={() => void lock()}>
            <LockKeyhole className="h-4 w-4" />Lock now
          </Button>
        )}
        <Button variant="destructive" className="min-h-11 gap-2" onClick={() => setConfirmErase(true)} disabled={erasing}>
          <Trash2 className="h-4 w-4" />Erase all local data
        </Button>
      </div>

      {status && (
        <p role="status" className={`flex items-start gap-2 text-sm ${status.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
          {status.type === "success" ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
          {status.message}
        </p>
      )}

      <DeleteConfirmDialog
        open={confirmErase}
        onOpenChange={setConfirmErase}
        title="Erase all data on this device?"
        description="This permanently removes transactions, accounts, categories, settings, recovery data, and the notification review inbox. Create an encrypted backup first if you may need this data again."
        confirmLabel="Erase everything"
        onConfirm={() => void erase()}
      />
    </div>
  )
}

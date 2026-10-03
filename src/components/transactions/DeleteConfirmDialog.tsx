"use client"

import { useState, useEffect, useRef } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  cascadeCount?: number
  confirmLabel?: string
  onConfirm: (cascade: boolean) => void | boolean | Promise<void | boolean>
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = "Delete transaction",
  description = "This action cannot be undone.",
  cascadeCount,
  confirmLabel = "Delete",
  onConfirm,
}: Props) {
  const saving = useRef(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cascade, setCascade] = useState(false)

  useEffect(() => {
    if (!open) setCascade(false)
  }, [open])

  const showCascade = (cascadeCount ?? 0) > 0

  return (
    <AlertDialog open={open} onOpenChange={next => { if (!saving.current) onOpenChange(next) }}>
      <AlertDialogContent onEscapeKeyDown={e => { if (saving.current) e.preventDefault() }}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {showCascade && (
          <label className="min-h-12 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none pb-1">
            <input
              type="checkbox"
              checked={cascade}
              onChange={(e) => setCascade(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-600 accent-rose-500"
            />
            Also delete {cascadeCount} generated transaction{cascadeCount !== 1 ? "s" : ""}
          </label>
        )}

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async event => {
              event.preventDefault()
              if (saving.current) return
              saving.current = true; setBusy(true); setError(null)
              try { if (await onConfirm(cascade) !== false) onOpenChange(false) }
              catch { setError("Could not complete this action. Retry.") }
              finally { saving.current = false; setBusy(false) }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? "Saving…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

"use client"

import { useState, useEffect } from "react"
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
  onConfirm: (cascade: boolean) => void
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title = "Delete transaction",
  description = "This action cannot be undone.",
  cascadeCount,
  onConfirm,
}: Props) {
  const [cascade, setCascade] = useState(false)

  useEffect(() => {
    if (!open) setCascade(false)
  }, [open])

  const showCascade = (cascadeCount ?? 0) > 0

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {showCascade && (
          <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer select-none pb-1">
            <input
              type="checkbox"
              checked={cascade}
              onChange={(e) => setCascade(e.target.checked)}
              className="rounded border-zinc-300 dark:border-zinc-600 accent-rose-500"
            />
            Also delete {cascadeCount} generated transaction{cascadeCount !== 1 ? "s" : ""}
          </label>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(cascade)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

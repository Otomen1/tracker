"use client"

import { X, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

export type ToastVariant = "warning" | "error" | "success"

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

const config: Record<ToastVariant, { icon: React.ElementType; classes: string }> = {
  warning: {
    icon: AlertTriangle,
    classes: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
  },
  error: {
    icon: AlertCircle,
    classes: "bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200",
  },
  success: {
    icon: CheckCircle,
    classes: "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200",
  },
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { icon: Icon, classes } = config[toast.variant]
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2.5 px-3.5 py-3 rounded-lg border shadow-lg text-sm max-w-sm w-full",
        "animate-in slide-in-from-right-4 fade-in duration-200",
        classes
      )}
    >
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

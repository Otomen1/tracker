import { CheckCircle, AlertTriangle, AlertCircle, Info, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type StatusTone = "good" | "warning" | "critical" | "neutral"

export const statusConfig: Record<StatusTone, { icon: LucideIcon; className: string }> = {
  good: { icon: CheckCircle, className: "text-emerald-500 dark:text-emerald-400" },
  warning: { icon: AlertTriangle, className: "text-amber-500 dark:text-amber-400" },
  critical: { icon: AlertCircle, className: "text-rose-500 dark:text-rose-400" },
  neutral: { icon: Info, className: "text-zinc-400" },
}

interface StatusProps {
  tone: StatusTone
  label: string
  className?: string
  iconClassName?: string
}

function Status({ tone, label, className, iconClassName }: StatusProps) {
  const { icon: Icon, className: toneClassName } = statusConfig[tone]
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", toneClassName, className)}>
      <Icon className={cn("w-4 h-4 shrink-0", iconClassName)} aria-hidden="true" />
      {label}
    </span>
  )
}

export { Status }

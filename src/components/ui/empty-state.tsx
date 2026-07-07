import Link from "next/link"
import { type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateAction {
  label: string
  onClick?: () => void
  href?: string
}

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: EmptyStateAction
  actionVariant?: "primary" | "secondary"
  className?: string
}

function EmptyState({ icon: Icon, title, description, action, actionVariant = "primary", className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center py-12 px-4", className)}>
      <Icon className="w-7 h-7 text-zinc-400 dark:text-zinc-500 mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      {description && (
        <p className="text-xs text-zinc-400 mt-1 max-w-xs">{description}</p>
      )}
      {action && (
        <Button
          variant={actionVariant === "primary" ? "default" : "outline"}
          size="sm"
          className="mt-4"
          asChild={!!action.href}
          onClick={action.onClick}
        >
          {action.href ? <Link href={action.href}>{action.label}</Link> : action.label}
        </Button>
      )}
    </div>
  )
}

export { EmptyState }

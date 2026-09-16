import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function SectionHeader({ title, description, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}


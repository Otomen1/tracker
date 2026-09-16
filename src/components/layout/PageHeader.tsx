import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-xl">{title}</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>
      {action && <div className="min-w-0 shrink-0">{action}</div>}
    </header>
  )
}

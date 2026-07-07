import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded bg-zinc-200 dark:bg-zinc-700", className)} />
}

function SkeletonText({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-4 w-full", className)} />
}

function SkeletonAvatar({ className }: SkeletonProps) {
  return <Skeleton className={cn("h-8 w-8 rounded-full shrink-0", className)} />
}

function SkeletonRow({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <SkeletonAvatar />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonRow }

export function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm p-5">
      <div className="h-4 w-36 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse mb-4" />
      <div
        className="w-full bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse"
        style={{ height }}
      />
    </div>
  )
}

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

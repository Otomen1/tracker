"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400 px-4">
      <AlertTriangle className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Something went wrong</p>
      <p className="text-xs mt-1 mb-5 text-center">An unexpected error occurred. Your data is safe.</p>
      <Button variant="outline" size="sm" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}

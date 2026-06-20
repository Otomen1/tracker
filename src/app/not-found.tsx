import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-zinc-400 px-4">
      <FileQuestion className="w-10 h-10 mb-3 opacity-40" />
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Page not found</p>
      <p className="text-xs mt-1 mb-5">This page doesn&apos;t exist.</p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/">Go to Dashboard</Link>
      </Button>
    </div>
  )
}

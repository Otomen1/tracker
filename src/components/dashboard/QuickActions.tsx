"use client"

import Link from "next/link"
import { Plus, ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  onAddClick: () => void
}

export function QuickActions({ onAddClick }: Props) {
  return (
    <div className="flex gap-2">
      <Button size="sm" className="gap-1.5" onClick={onAddClick}>
        <Plus className="w-4 h-4" />
        Add Transaction
      </Button>
      <Button size="sm" variant="outline" className="gap-1.5" asChild>
        <Link href="/transactions">
          <ArrowLeftRight className="w-4 h-4" />
          View Transactions
        </Link>
      </Button>
    </div>
  )
}

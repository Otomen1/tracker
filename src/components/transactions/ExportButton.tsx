"use client"

import { Transaction, Category } from "@/types"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { transactionsToCSV, downloadCSV } from "@/lib/csv"
import { getMonthKey, formatMonth } from "@/lib/formatters"

interface Props {
  transactions: Transaction[]
  categories: Category[]
}

export function ExportButton({ transactions, categories }: Props) {
  const handleExport = () => {
    const csv = transactionsToCSV(transactions, categories)
    const filename = `transactions-${getMonthKey()}.csv`
    downloadCSV(csv, filename)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={transactions.length === 0}
      className="gap-1.5"
    >
      <Download className="w-4 h-4" />
      Export CSV
    </Button>
  )
}

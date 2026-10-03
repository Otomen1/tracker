"use client"

import { useEffect, useRef, useState } from "react"
import { useAccounts } from "@/context/AccountsContext"
import { Transaction, Category } from "@/types"
import { Button } from "@/components/ui/button"
import { ChevronDown, Download, FileText } from "lucide-react"
import { transactionsToCSV, downloadCSV } from "@/lib/csv"
import { transactionsToPDF } from "@/lib/pdf"
import { addMonths, getMonthKey } from "@/lib/formatters"
import { cn } from "@/lib/utils"

interface Props {
  allTransactions: Transaction[]
  transactions: Transaction[]
  categories: Category[]
  currency: string
}

interface Preset {
  label: string
  value: string
  getRange: () => { from: string; to: string } | null
  getFilename: (ext: string) => string
  getRangeLabel: () => string
}

const PRESETS: Preset[] = (() => {
  const cur = getMonthKey()
  const [curYear] = cur.split("-")

  return [
    {
      label: "This month",
      value: "this-month",
      getRange: () => ({ from: `${cur}-01`, to: `${cur}-31` }),
      getFilename: (ext) => `transactions-${cur}.${ext}`,
      getRangeLabel: () => `This month (${cur})`,
    },
    {
      label: "Last month",
      value: "last-month",
      getRange: () => {
        const m = addMonths(cur, -1)
        return { from: `${m}-01`, to: `${m}-31` }
      },
      getFilename: (ext) => `transactions-${addMonths(cur, -1)}.${ext}`,
      getRangeLabel: () => `Last month (${addMonths(cur, -1)})`,
    },
    {
      label: "Last 3 months",
      value: "last-3",
      getRange: () => ({ from: `${addMonths(cur, -2)}-01`, to: `${cur}-31` }),
      getFilename: (ext) => `transactions-last-3-months.${ext}`,
      getRangeLabel: () => "Last 3 months",
    },
    {
      label: "Last 6 months",
      value: "last-6",
      getRange: () => ({ from: `${addMonths(cur, -5)}-01`, to: `${cur}-31` }),
      getFilename: (ext) => `transactions-last-6-months.${ext}`,
      getRangeLabel: () => "Last 6 months",
    },
    {
      label: "This year",
      value: "this-year",
      getRange: () => ({ from: `${curYear}-01-01`, to: `${curYear}-12-31` }),
      getFilename: (ext) => `transactions-${curYear}.${ext}`,
      getRangeLabel: () => `This year (${curYear})`,
    },
    {
      label: "All time",
      value: "all",
      getRange: () => null,
      getFilename: (ext) => `transactions-all.${ext}`,
      getRangeLabel: () => "All time",
    },
  ]
})()

function filterByRange(transactions: Transaction[], range: { from: string; to: string } | null) {
  if (!range) return transactions
  return transactions.filter((t) => t.date >= range.from && t.date <= range.to)
}

export function ExportButton({ allTransactions, transactions, categories, currency }: Props) {
  const { accounts } = useAccounts()
  const [open, setOpen] = useState(false)
  const [pdfLoading, setPdfLoading] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const busy = useRef(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const isEmpty = allTransactions.length === 0

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleOutside)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  const runExport = async (filename: string, operation: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    setPdfLoading(filename)
    setExportError(null)
    try {
      await operation()
      setOpen(false)
    } catch {
      setExportError("Export could not be completed. Try again or choose another destination.")
    } finally {
      busy.current = false
      setPdfLoading(null)
    }
  }
  const handleCSV = (txns: Transaction[], filename: string) =>
    runExport(filename, () => downloadCSV(transactionsToCSV(txns, categories, accounts), filename))
  const handlePDF = (txns: Transaction[], rangeLabel: string, filename: string) =>
    runExport(filename, () => transactionsToPDF(txns, categories, rangeLabel, currency, filename, accounts))

  const rows: Array<{ label: string; txns: Transaction[]; csvFile: string; pdfFile: string; rangeLabel: string }> = [
    ...PRESETS.map((p) => ({
      label: p.label,
      txns: filterByRange(allTransactions, p.getRange()),
      csvFile: p.getFilename("csv"),
      pdfFile: p.getFilename("pdf"),
      rangeLabel: p.getRangeLabel(),
    })),
    {
      label: "Current view",
      txns: transactions,
      csvFile: "transactions-filtered.csv",
      pdfFile: "transactions-filtered.pdf",
      rangeLabel: "Current view",
    },
  ]

  return (
    <div ref={ref} className="relative">
      <Button
        variant="outline"
        size="sm"
        disabled={isEmpty || pdfLoading !== null}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="gap-1.5"
      >
        <Download className="w-4 h-4" />
        Export
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open && "rotate-180")} />
      </Button>

      {exportError && <p role="alert" className="text-sm text-red-600">{exportError}</p>}
      {open && (
        <div role="menu" className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 z-20 w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden">
          <p className="px-3 py-2 text-xs text-zinc-500">CSV and PDF exports contain unencrypted records.</p>
          {/* Column headers */}
          <div className="flex items-center px-3 py-2 border-b border-zinc-100 dark:border-zinc-800">
            <span className="flex-1 text-xs font-medium text-zinc-400 uppercase tracking-wide">Date range</span>
            <span className="w-16 text-center text-xs font-medium text-zinc-400 uppercase tracking-wide">CSV</span>
            <span className="w-16 text-center text-xs font-medium text-zinc-400 uppercase tracking-wide">PDF</span>
          </div>

          {rows.map((row, i) => (
            <div key={row.csvFile}>
              {i === rows.length - 1 && (
                <div className="border-t border-zinc-100 dark:border-zinc-800" />
              )}
              <div role="menuitem" className="flex items-center px-3 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <span className="flex-1 text-sm text-zinc-700 dark:text-zinc-300">{row.label}</span>

                {/* CSV */}
                <button
                  disabled={row.txns.length === 0 || pdfLoading !== null}
                  onClick={() => handleCSV(row.txns, row.csvFile)}
                  aria-label={`Export ${row.label} as CSV`} title={`Download ${row.label} as CSV`}
                  className="w-16 min-h-11 items-center flex justify-center py-1 rounded text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {/* PDF */}
                <button
                  disabled={row.txns.length === 0 || pdfLoading !== null}
                  onClick={() => handlePDF(row.txns, row.rangeLabel, row.pdfFile)}
                  aria-label={`Export ${row.label} as PDF`} title={`Download ${row.label} as PDF`}
                  className="w-16 min-h-11 items-center flex justify-center py-1 rounded text-zinc-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {pdfLoading === row.pdfFile
                    ? <span className="text-[10px] text-zinc-400">...</span>
                    : <FileText className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

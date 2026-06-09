"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { exportAllData, importAllData } from "@/lib/storage"
import { Download, Upload, CheckCircle, AlertCircle } from "lucide-react"

export function BackupRestore() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const handleExport = () => {
    const data = exportAllData()
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `expense-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const result = importAllData(text)
      if (result.success) {
        setStatus({ type: "success", message: "Data restored successfully. Refresh to see changes." })
      } else {
        setStatus({ type: "error", message: result.error ?? "Import failed" })
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
          <Download className="w-4 h-4" />
          Export Backup
        </Button>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4" />
          Import Backup
        </Button>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
      </div>
      {status && (
        <div className={`flex items-center gap-2 text-sm ${status.type === "success" ? "text-emerald-600" : "text-rose-500"}`}>
          {status.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {status.message}
        </div>
      )}
      <p className="text-xs text-zinc-400">Export saves all transactions, categories, and settings to a JSON file. Import restores from a previous backup.</p>
    </div>
  )
}

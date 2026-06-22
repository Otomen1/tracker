"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { exportAllData, importAllData, logSecurityEvent } from "@/lib/storage"
import { encryptData, decryptData, computeChecksum, verifyChecksum } from "@/lib/crypto"
import { Download, Upload, CheckCircle, AlertCircle, Lock, ShieldCheck, ShieldAlert } from "lucide-react"
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog"
import { BACKUP_MAX_FILE_SIZE_MB } from "@/lib/constants"
import { useSettingsContext } from "@/context/SettingsContext"

const BACKUP_INTERVAL_LABELS: Record<string, string> = {
  never: "Never",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
}

type Status = { type: "success" | "error" | "warning"; message: string }
type ImportPhase = "none" | "needs-password" | "confirming"

export function BackupRestore() {
  const fileRef = useRef<HTMLInputElement>(null)
  const { settings, updateSettings } = useSettingsContext()
  const backupInterval = settings.backupInterval ?? "never"

  const [status, setStatus] = useState<Status | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportEncrypt, setExportEncrypt] = useState(false)
  const [exportPassword, setExportPassword] = useState("")

  const [importPhase, setImportPhase] = useState<ImportPhase>("none")
  const [pendingText, setPendingText] = useState<string | null>(null)
  const [encryptedPayload, setEncryptedPayload] = useState<string | null>(null)
  const [importPassword, setImportPassword] = useState("")
  const [decrypting, setDecrypting] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [checksumValid, setChecksumValid] = useState<boolean | null>(null)

  const resetImport = () => {
    setImportPhase("none")
    setPendingText(null)
    setEncryptedPayload(null)
    setImportPassword("")
    setPasswordError(null)
    setChecksumValid(null)
  }

  // A02/A08: export with optional encryption + SHA-256 checksum
  const handleExport = async () => {
    setExporting(true)
    try {
      const rawJson = exportAllData()
      const checksum = await computeChecksum(rawJson)
      const dataWithChecksum = { ...JSON.parse(rawJson), checksum }
      const signedJson = JSON.stringify(dataWithChecksum, null, 2)
      const date = new Date().toISOString().slice(0, 10)

      let finalContent: string
      let filename: string

      if (exportEncrypt && exportPassword) {
        const payload = await encryptData(signedJson, exportPassword)
        finalContent = JSON.stringify(
          { encrypted: true, exportedAt: new Date().toISOString(), payload },
          null, 2
        )
        filename = `expense-tracker-backup-${date}.enc.json`
        logSecurityEvent("backup_export_encrypted")
      } else {
        finalContent = signedJson
        filename = `expense-tracker-backup-${date}.json`
      }

      const blob = new Blob([finalContent], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      link.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setStatus({ type: "error", message: "Export failed. Please try again." })
      console.error(e)
    } finally {
      setExporting(false)
    }
  }

  // A08: on file select, detect encrypted files and read content
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ""
    setStatus(null)
    if (file.size > BACKUP_MAX_FILE_SIZE_MB * 1024 * 1024) {
      setStatus({ type: "error", message: `File too large (max ${BACKUP_MAX_FILE_SIZE_MB} MB)` })
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const parsed = JSON.parse(text)
        if (parsed.encrypted === true && typeof parsed.payload === "string") {
          setEncryptedPayload(parsed.payload)
          setImportPhase("needs-password")
        } else {
          setPendingText(text)
          setImportPhase("confirming")
        }
      } catch {
        setStatus({ type: "error", message: "Invalid backup file" })
      }
    }
    reader.onerror = () => setStatus({ type: "error", message: "Could not read the file" })
    reader.readAsText(file)
  }

  // A02: decrypt encrypted backup using entered password
  const handleDecrypt = async () => {
    if (!encryptedPayload || !importPassword) return
    setDecrypting(true)
    setPasswordError(null)
    try {
      const decrypted = await decryptData(encryptedPayload, importPassword)
      logSecurityEvent("backup_decrypt_success")
      setPendingText(decrypted)
      setImportPhase("confirming")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Decryption failed"
      setPasswordError(msg)
      logSecurityEvent("backup_decrypt_failure")
    } finally {
      setDecrypting(false)
    }
  }

  // A08: verify SHA-256 checksum before importing
  const handleConfirmImport = async () => {
    if (!pendingText) return

    try {
      const parsed = JSON.parse(pendingText)
      if (parsed.checksum && typeof parsed.checksum === "string") {
        const { checksum, ...rest } = parsed
        const valid = await verifyChecksum(JSON.stringify(rest, null, 2), checksum)
        setChecksumValid(valid)
        if (!valid) {
          setStatus({ type: "warning", message: "Checksum mismatch — file may have been modified. Proceed with caution." })
          logSecurityEvent("backup_checksum_mismatch")
          return
        }
        logSecurityEvent("backup_checksum_verified")
      }
    } catch {
      // No checksum in old backups — proceed without verification
    }

    doImport(pendingText)
  }

  const doImport = (text: string) => {
    const result = importAllData(text)
    resetImport()
    if (result.success) {
      setStatus({ type: "success", message: "Data restored successfully. Refresh to see changes." })
    } else {
      setStatus({ type: "error", message: result.error ?? "Import failed" })
    }
  }

  return (
    <div className="space-y-3">
      {/* Export */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline" size="sm" className="gap-2"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="w-4 h-4" />
            {exporting ? "Exporting…" : "Export Backup"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4" />
            Import Backup
          </Button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelected} />
        </div>

        {/* A02: optional encryption for export */}
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 rounded border-input"
            checked={exportEncrypt}
            onChange={(e) => setExportEncrypt(e.target.checked)}
          />
          <Lock className="w-3 h-3 text-zinc-400" />
          <span className="text-xs text-zinc-500">Password-protect backup</span>
        </label>
        {exportEncrypt && (
          <Input
            type="password"
            placeholder="Encryption password"
            className="h-8 w-56 text-sm"
            value={exportPassword}
            onChange={(e) => setExportPassword(e.target.value)}
            autoComplete="new-password"
          />
        )}
      </div>

      {/* Status message */}
      {status && (
        <div className={`flex items-start gap-2 text-sm ${
          status.type === "success" ? "text-emerald-600" :
          status.type === "warning" ? "text-amber-500" : "text-rose-500"
        }`}>
          {status.type === "success" ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> :
           status.type === "warning" ? <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /> :
           <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {status.message}
          {status.type === "warning" && (
            <button
              className="ml-auto text-xs underline shrink-0"
              onClick={() => pendingText && doImport(pendingText)}
            >
              Import anyway
            </button>
          )}
        </div>
      )}

      {/* Checksum verified indicator */}
      {checksumValid === true && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <ShieldCheck className="w-3.5 h-3.5" />
          Integrity verified
        </div>
      )}

      <p className="text-xs text-zinc-400">
        Backups include a SHA-256 checksum. Use password protection for sensitive data.
      </p>

      {/* Auto backup interval */}
      <div className="flex items-center gap-3 pt-1">
        <span className="text-sm text-zinc-700 dark:text-zinc-300 shrink-0">Auto backup</span>
        <Select
          value={backupInterval}
          onValueChange={(v) => {
            const next = v as "never" | "daily" | "weekly" | "monthly"
            const patch = backupInterval === "never" && next !== "never"
              ? { backupInterval: next, lastBackupAt: undefined }
              : { backupInterval: next }
            updateSettings(patch)
          }}
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue>{BACKUP_INTERVAL_LABELS[backupInterval]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(BACKUP_INTERVAL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {backupInterval !== "never" && settings.lastBackupAt && (
          <span className="text-xs text-zinc-400">
            Last: {new Date(settings.lastBackupAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Encrypted file password prompt */}
      {importPhase === "needs-password" && (
        <div className="p-3 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Lock className="w-3.5 h-3.5" />
            Encrypted backup — enter password to restore
          </div>
          <Input
            type="password"
            placeholder="Password"
            className="h-8 text-sm"
            value={importPassword}
            onChange={(e) => { setImportPassword(e.target.value); setPasswordError(null) }}
            onKeyDown={(e) => e.key === "Enter" && handleDecrypt()}
            autoComplete="current-password"
            autoFocus
          />
          {passwordError && <p className="text-xs text-rose-500">{passwordError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetImport}>Cancel</Button>
            <Button size="sm" disabled={!importPassword || decrypting} onClick={handleDecrypt}>
              {decrypting ? "Decrypting…" : "Decrypt & Continue"}
            </Button>
          </div>
        </div>
      )}

      {/* Import confirmation dialog */}
      <DeleteConfirmDialog
        open={importPhase === "confirming"}
        onOpenChange={(open) => { if (!open) resetImport() }}
        title="Replace all data?"
        description="This will replace ALL your current transactions, categories, and settings with the backup file. This cannot be undone."
        onConfirm={handleConfirmImport}
      />
    </div>
  )
}

"use client"

import { useRef, useState } from "react"
import { AlertCircle, CheckCircle, Download, Lock, ShieldCheck, Upload } from "lucide-react"
import { useVault } from "@/context/VaultContext"
import { useSettingsContext } from "@/context/SettingsContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DeleteConfirmDialog } from "@/components/transactions/DeleteConfirmDialog"
import { BACKUP_MAX_FILE_SIZE_MB } from "@/lib/constants"
import { decryptData, encryptData } from "@/lib/crypto"
import { saveOrShareFile } from "@/lib/fileExport"
import { createBackupJson, logSecurityEvent, parseBackupJson } from "@/lib/storage"
import { nativeVault } from "@/lib/nativeVault"
import type { VaultData } from "@/lib/vault/schema"

type Status = { type: "success" | "error" | "warning"; message: string }

export function BackupRestore() {
  const fileRef = useRef<HTMLInputElement>(null)
  const vault = useVault()
  const { settings, updateSettings } = useSettingsContext()
  const [status, setStatus] = useState<Status | null>(null)
  const [exporting, setExporting] = useState(false)
  const [exportPassword, setExportPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pendingEncrypted, setPendingEncrypted] = useState<string | null>(null)
  const [pendingVault, setPendingVault] = useState<VaultData | null>(null)
  const [importPassword, setImportPassword] = useState("")
  const [decrypting, setDecrypting] = useState(false)

  const requireFreshAuthentication = async () => {
    if (!nativeVault.isNative()) return true
    return nativeVault.unlock()
  }

  const handleExport = async () => {
    setStatus(null)
    if (exportPassword.length < 12) {
      setStatus({ type: "error", message: "Use an encryption password with at least 12 characters." })
      return
    }
    if (exportPassword !== confirmPassword) {
      setStatus({ type: "error", message: "The two encryption passwords do not match." })
      return
    }
    setExporting(true)
    try {
      if (!await requireFreshAuthentication()) throw new Error("Authentication was cancelled")
      const encrypted = await encryptData(createBackupJson(vault.data), exportPassword)
      const envelope = JSON.stringify({
        format: "tracker-encrypted-backup",
        version: 2,
        encrypted: true,
        exportedAt: new Date().toISOString(),
        kdf: { name: "PBKDF2-SHA256", iterations: 250_000 },
        cipher: { name: "AES-256-GCM" },
        payload: encrypted,
      }, null, 2)
      const date = new Date().toISOString().slice(0, 10)
      const result = await saveOrShareFile(envelope, `tracker-backup-${date}.enc.json`, "application/json")
      await updateSettings({ lastBackupAt: new Date().toISOString(), backupInterval: "never" })
      setExportPassword("")
      setConfirmPassword("")
      logSecurityEvent("backup_export_encrypted")
      setStatus({ type: "success", message: result === "shared" ? "Encrypted backup is ready to save or share." : "Encrypted backup downloaded." })
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Backup export failed." })
    } finally {
      setExporting(false)
    }
  }

  const stageBackup = (plaintext: string) => {
    const parsed = parseBackupJson(plaintext, vault.data)
    if (!parsed.success) {
      setStatus({ type: "error", message: parsed.error })
      return
    }
    setPendingVault(parsed.vault)
  }

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    setStatus(null)
    if (file.size > BACKUP_MAX_FILE_SIZE_MB * 1024 * 1024) {
      setStatus({ type: "error", message: `File is too large. Maximum size is ${BACKUP_MAX_FILE_SIZE_MB} MB.` })
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? "")
      try {
        const envelope = JSON.parse(text) as { encrypted?: boolean; payload?: unknown }
        if (envelope.encrypted === true && typeof envelope.payload === "string") {
          setPendingEncrypted(envelope.payload)
          return
        }
        setStatus({ type: "warning", message: "This is an older unencrypted backup. It can be restored, but store it somewhere private." })
        stageBackup(text)
      } catch {
        setStatus({ type: "error", message: "The selected file is not a valid Tracker backup." })
      }
    }
    reader.onerror = () => setStatus({ type: "error", message: "The backup file could not be read." })
    reader.readAsText(file)
  }

  const handleDecrypt = async () => {
    if (!pendingEncrypted || !importPassword) return
    setDecrypting(true)
    setStatus(null)
    try {
      stageBackup(await decryptData(pendingEncrypted, importPassword))
      setPendingEncrypted(null)
      setImportPassword("")
      logSecurityEvent("backup_decrypt_success")
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Backup decryption failed." })
      logSecurityEvent("backup_decrypt_failure")
    } finally {
      setDecrypting(false)
    }
  }

  const restore = async () => {
    if (!pendingVault) return
    try {
      if (!await requireFreshAuthentication()) throw new Error("Authentication was cancelled")
      if (!await vault.replace(pendingVault)) throw new Error("The encrypted vault could not be updated")
      setPendingVault(null)
      setStatus({ type: "success", message: "Backup restored and verified successfully." })
      logSecurityEvent("backup_import_success", { transactionCount: pendingVault.transactions.length })
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "Backup restore failed." })
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" />Local encrypted vault</p>
        <p className="mt-1 text-xs opacity-80">Confirmed financial records remain on this device. Portable backups are always password-encrypted.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div><p className="text-sm font-medium">Create portable backup</p><p className="text-xs text-zinc-500">Use at least 12 characters. The password cannot be recovered.</p></div>
          <Input type="password" value={exportPassword} onChange={(event) => setExportPassword(event.target.value)} placeholder="Encryption password" autoComplete="new-password" />
          <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm password" autoComplete="new-password" />
          <Button className="w-full gap-2" onClick={() => void handleExport()} disabled={exporting}>
            <Download className="h-4 w-4" />{exporting ? "Encrypting…" : "Create encrypted backup"}
          </Button>
          {settings.lastBackupAt && <p className="text-xs text-zinc-500">Last portable backup: {new Date(settings.lastBackupAt).toLocaleString()}</p>}
        </section>

        <section className="space-y-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
          <div><p className="text-sm font-medium">Restore portable backup</p><p className="text-xs text-zinc-500">The file is validated before any current data is replaced.</p></div>
          <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" />Choose backup file</Button>
          <input ref={fileRef} type="file" accept=".json,.enc" className="hidden" onChange={handleFileSelected} />
          {pendingEncrypted && <div className="space-y-2"><div className="flex items-center gap-2 text-xs font-medium"><Lock className="h-3.5 w-3.5" />Encrypted backup selected</div><Input type="password" value={importPassword} onChange={(event) => setImportPassword(event.target.value)} placeholder="Backup password" autoComplete="current-password" onKeyDown={(event) => { if (event.key === "Enter") void handleDecrypt() }} /><Button className="w-full" onClick={() => void handleDecrypt()} disabled={!importPassword || decrypting}>{decrypting ? "Decrypting…" : "Decrypt and verify"}</Button></div>}
        </section>
      </div>

      {status && <div role="status" className={`flex items-start gap-2 text-sm ${status.type === "success" ? "text-emerald-600" : status.type === "warning" ? "text-amber-600" : "text-rose-600"}`}>{status.type === "success" ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}{status.message}</div>}

      <DeleteConfirmDialog
        open={pendingVault !== null}
        onOpenChange={(open) => { if (!open) setPendingVault(null) }}
        title="Replace all local data?"
        description={`The verified backup contains ${pendingVault?.transactions.length ?? 0} transactions. Current data will first remain available as an encrypted recovery snapshot.`}
        confirmLabel="Replace data"
        onConfirm={() => void restore()}
      />
    </div>
  )
}

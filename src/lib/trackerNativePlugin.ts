import { registerPlugin } from "@capacitor/core"
import type { PendingTransaction } from "@/types"
import type { VaultData } from "@/lib/vault/schema"

export interface CaptureStatus {
  notificationAccess: boolean
  alertsEnabled: boolean
  rytEnabled: boolean
  maeEnabled: boolean
}

export interface VaultStatus {
  exists: boolean
  unlocked: boolean
  hasRecovery: boolean
}

interface TrackerNativeApi {
  isAvailable(): Promise<{ available: boolean }>
  getCaptureStatus(): Promise<CaptureStatus>
  setSources(options: { ryt: boolean; mae: boolean }): Promise<void>
  openNotificationAccess(): Promise<void>
  requestPrivateAlerts(): Promise<void>
  listPending(): Promise<{ items: PendingTransaction[]; error?: string | null }>
  discardPending(options: { id: string }): Promise<void>
  dismissPendingError(): Promise<void>
  getVaultStatus(): Promise<VaultStatus>
  authenticate(): Promise<{ authenticated: boolean }>
  lockVault(): Promise<void>
  readVault(): Promise<{ vault: VaultData }>
  initializeVault(options: { vault: VaultData }): Promise<{ vault: VaultData }>
  writeVault(options: { vault: VaultData; expectedRevision: number }): Promise<{ vault: VaultData }>
  restorePreviousVault(): Promise<{ vault: VaultData }>
  eraseVault(): Promise<void>
}

export const trackerNativePlugin = registerPlugin<TrackerNativeApi>("TrackerNative")

"use client"

import { Capacitor } from "@capacitor/core"
import { trackerNativePlugin as plugin, type VaultStatus } from "@/lib/trackerNativePlugin"
import type { VaultData } from "@/lib/vault/schema"

export const nativeVault = {
  isNative: () => Capacitor.isNativePlatform(),
  status: async (): Promise<VaultStatus> => Capacitor.isNativePlatform()
    ? plugin.getVaultStatus()
    : { exists: false, unlocked: true, hasRecovery: false },
  unlock: async () => Capacitor.isNativePlatform() ? (await plugin.authenticate()).authenticated : true,
  lock: async () => { if (Capacitor.isNativePlatform()) await plugin.lockVault() },
  read: async () => (await plugin.readVault()).vault,
  initialize: async (vault: VaultData) => (await plugin.initializeVault({ vault })).vault,
  write: async (vault: VaultData, expectedRevision: number, restoring = false) => (await plugin.writeVault({ vault, expectedRevision, restoring })).vault,
  restorePrevious: async () => (await plugin.restorePreviousVault()).vault,
  restoreMigration: async () => (await plugin.restoreMigrationVault()).vault,
  erase: async () => { if (Capacitor.isNativePlatform()) await plugin.eraseVault() },
}

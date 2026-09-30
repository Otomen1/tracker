import { Capacitor } from "@capacitor/core"
import type { PendingTransaction } from "@/types"
import { trackerNativePlugin as nativePlugin, type CaptureStatus } from "@/lib/trackerNativePlugin"

const webStatus: CaptureStatus = { notificationAccess: false, alertsEnabled: false, rytEnabled: false, maeEnabled: false }

export const nativeCapture = {
  isNative: () => Capacitor.isNativePlatform(),
  getStatus: async () => Capacitor.isNativePlatform() ? nativePlugin.getCaptureStatus() : webStatus,
  setSources: async (ryt: boolean, mae: boolean) => { if (Capacitor.isNativePlatform()) await nativePlugin.setSources({ ryt, mae }) },
  openNotificationAccess: async () => { if (Capacitor.isNativePlatform()) await nativePlugin.openNotificationAccess() },
  requestPrivateAlerts: async () => { if (Capacitor.isNativePlatform()) await nativePlugin.requestPrivateAlerts() },
  listPending: async () => Capacitor.isNativePlatform() ? await nativePlugin.listPending() : { items: [] as PendingTransaction[] },
  discardPending: async (id: string) => { if (Capacitor.isNativePlatform()) await nativePlugin.discardPending({ id }) },
  dismissPendingError: async () => { if (Capacitor.isNativePlatform()) await nativePlugin.dismissPendingError() },
}

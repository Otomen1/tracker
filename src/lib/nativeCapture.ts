import { Capacitor, registerPlugin } from "@capacitor/core"
import { PendingTransaction } from "@/types"

interface CaptureStatus {
  notificationAccess: boolean
  alertsEnabled: boolean
  rytEnabled: boolean
  maeEnabled: boolean
}

interface TrackerNativeApi {
  isAvailable(): Promise<{ available: boolean }>
  getCaptureStatus(): Promise<CaptureStatus>
  setSources(options: { ryt: boolean; mae: boolean }): Promise<void>
  openNotificationAccess(): Promise<void>
  requestPrivateAlerts(): Promise<void>
  listPending(): Promise<{ items: PendingTransaction[] }>
  discardPending(options: { id: string }): Promise<void>
  authenticate(): Promise<{ authenticated: boolean }>
}

const nativePlugin = registerPlugin<TrackerNativeApi>("TrackerNative")

const webStatus: CaptureStatus = { notificationAccess: false, alertsEnabled: false, rytEnabled: false, maeEnabled: false }

export const nativeCapture = {
  isNative: () => Capacitor.isNativePlatform(),
  getStatus: async () => Capacitor.isNativePlatform() ? nativePlugin.getCaptureStatus() : webStatus,
  setSources: async (ryt: boolean, mae: boolean) => { if (Capacitor.isNativePlatform()) await nativePlugin.setSources({ ryt, mae }) },
  openNotificationAccess: async () => { if (Capacitor.isNativePlatform()) await nativePlugin.openNotificationAccess() },
  requestPrivateAlerts: async () => { if (Capacitor.isNativePlatform()) await nativePlugin.requestPrivateAlerts() },
  listPending: async () => Capacitor.isNativePlatform() ? (await nativePlugin.listPending()).items : [],
  discardPending: async (id: string) => { if (Capacitor.isNativePlatform()) await nativePlugin.discardPending({ id }) },
  authenticate: async () => Capacitor.isNativePlatform() ? (await nativePlugin.authenticate()).authenticated : true,
}

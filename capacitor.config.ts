import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.otomen.tracker",
  appName: "Tracker",
  webDir: "out",
  android: { allowMixedContent: false },
}

export default config

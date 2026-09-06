import { exportAllData } from "@/lib/storage"
import { STORAGE_KEYS } from "@/lib/constants"

describe("backup privacy", () => {
  beforeEach(() => localStorage.clear())

  it("does not export device-only secrets or timestamps", () => {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, "[]")
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, "[]")
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      currency: "USD",
      theme: "system",
      monthlySavingsGoal: 0,
      backupPassword: "do-not-export",
      lastBackupAt: "2026-09-06T00:00:00.000Z",
    }))

    const backup = JSON.parse(exportAllData())
    expect(backup.settings.backupPassword).toBeUndefined()
    expect(backup.settings.lastBackupAt).toBeUndefined()
  })
})

"use client"

import { canLeaveScreen } from "@/lib/navigationGuard"
import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { trackerNativePlugin } from "@/lib/trackerNativePlugin"
import { nativeVault } from "@/lib/nativeVault"
import { useVault } from "@/context/VaultContext"

export function NativeBackCoordinator() {
  const pathname = usePathname()
  const router = useRouter()
  const { unlocked } = useVault()
  useEffect(() => {
    if (!nativeVault.isNative()) return
    let mounted = true
    const openInbox = () => { void trackerNativePlugin.consumeLaunchInbox().then(result => { if (mounted && result.open && canLeaveScreen()) router.replace("/inbox") }).catch(() => undefined) }
    openInbox()
    window.addEventListener("tracker-open-inbox", openInbox)
    const back = (event: Event) => {
      if (!unlocked) return // native terminal action exits while keeping lock
      const overlay = document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]')
      if (overlay) {
        event.preventDefault()
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true }))
        return
      }
      if (!canLeaveScreen()) { event.preventDefault(); return }
      const parent = pathname.startsWith("/settings/") ? "/settings" : pathname === "/" ? null : "/"
      if (parent) { event.preventDefault(); router.replace(parent) }
    }
    window.addEventListener("tracker-back", back)
    return () => { mounted = false; window.removeEventListener("tracker-back", back); window.removeEventListener("tracker-open-inbox", openInbox) }
  }, [pathname, router, unlocked])
  return null
}

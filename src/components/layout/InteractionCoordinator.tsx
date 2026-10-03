"use client"
import { useEffect } from "react"
import { canLeaveScreen } from "@/lib/navigationGuard"
export function InteractionCoordinator() {
  useEffect(() => {
    const navigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null
      if (!link || link.hasAttribute("download") || link.target === "_blank" || link.getAttribute("href")?.startsWith("#")) return
      if (!canLeaveScreen()) { event.preventDefault(); event.stopPropagation() }
    }
    const focus = (event: FocusEvent) => {
      const target = event.target as HTMLElement
      if (target.matches("input, textarea, select")) target.scrollIntoView?.({ block: "nearest", behavior: "auto" })
    }
    const resize = () => {
      document.documentElement.style.setProperty("--app-viewport-height", `${window.visualViewport?.height ?? window.innerHeight}px`)
      const active = document.activeElement as HTMLElement | null
      if (active?.matches("input, textarea, select")) active.scrollIntoView?.({ block: "nearest", behavior: "auto" })
    }
    window.addEventListener("resize", resize)
    resize()
    document.addEventListener("click", navigation, true)
    document.addEventListener("focusin", focus)
    window.visualViewport?.addEventListener("resize", resize)
    return () => { document.removeEventListener("click", navigation, true); document.removeEventListener("focusin", focus); window.removeEventListener("resize", resize); window.visualViewport?.removeEventListener("resize", resize); document.documentElement.style.removeProperty("--app-viewport-height") }
  }, [])
  return null
}

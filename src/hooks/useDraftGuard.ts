"use client"
import { useEffect, useRef } from "react"
import { registerDraftGuard } from "@/lib/navigationGuard"
export function useDraftGuard(dirty: boolean, busy: boolean) {
  const current = useRef({ dirty, busy })
  current.current = { dirty, busy }
  useEffect(() => {
    const unregister = registerDraftGuard(() => current.current)
    const unload = (event: BeforeUnloadEvent) => {
      if (current.current.dirty || current.current.busy) { event.preventDefault(); event.returnValue = "" }
    }
    window.addEventListener("beforeunload", unload)
    return () => { unregister(); window.removeEventListener("beforeunload", unload) }
  }, [])
}

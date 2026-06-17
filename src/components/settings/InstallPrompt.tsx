"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  if (!installEvent) return null

  const handleInstall = async () => {
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === "accepted") setInstallEvent(null)
  }

  return (
    <Button variant="outline" onClick={handleInstall}>
      <Download className="w-4 h-4 mr-2" />
      Install App
    </Button>
  )
}

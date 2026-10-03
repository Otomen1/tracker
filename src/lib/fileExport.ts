"use client"

import { Capacitor } from "@capacitor/core"

function toBase64(content: string | Uint8Array): string {
  const bytes = typeof content === "string" ? new TextEncoder().encode(content) : content
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(offset, offset + chunkSize)))
  }
  return btoa(binary)
}

export async function saveOrShareFile(content: string | Uint8Array, filename: string, mimeType: string): Promise<"shared" | "downloaded"> {
  if (Capacitor.isNativePlatform()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ])
    const result = await Filesystem.writeFile({
      path: filename,
      data: toBase64(content),
      directory: Directory.Cache,
      recursive: true,
    })
    try {
      await Share.share({
        title: "Tracker export",
        text: "Save this Tracker export somewhere private.",
        files: [result.uri],
        dialogTitle: "Save or share Tracker export",
      })
    } finally {
      await Filesystem.deleteFile({ path: filename, directory: Directory.Cache }).catch(() => undefined)
    }
    return "shared"
  }

  const blob = new Blob([typeof content === "string" ? content : new Uint8Array(content).buffer], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
  return "downloaded"
}

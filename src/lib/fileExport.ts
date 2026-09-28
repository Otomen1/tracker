"use client"

import { Capacitor } from "@capacitor/core"

function toBase64(content: string): string {
  const bytes = new TextEncoder().encode(content)
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(offset, offset + chunkSize)))
  }
  return btoa(binary)
}

export async function saveOrShareFile(content: string, filename: string, mimeType: string): Promise<"shared" | "downloaded"> {
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
    await Share.share({
      title: "Tracker backup",
      text: "Save this Tracker backup somewhere private.",
      files: [result.uri],
      dialogTitle: "Save or share backup",
    })
    return "shared"
  }

  const blob = new Blob([content], { type: mimeType })
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

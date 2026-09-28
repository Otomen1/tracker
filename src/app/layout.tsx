import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppShell } from "@/components/layout/AppShell"
import { Providers } from "@/components/providers/Providers"
import { ClerkProvider } from "@clerk/nextjs"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your income and expenses locally",
  manifest: "/manifest.json",
}

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const app = <Providers><AppShell>{children}</AppShell></Providers>
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {process.env.CAPACITOR_BUILD !== "1" && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? <ClerkProvider>{app}</ClerkProvider> : app}
      </body>
    </html>
  )
}

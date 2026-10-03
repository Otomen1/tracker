"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowLeftRight, BarChart3, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { nativeCapture } from "@/lib/nativeCapture"
import { useReviewInbox } from "@/context/ReviewInboxContext"
import { useHydrated } from "@/hooks/useHydrated"

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/transactions", label: "Activity", icon: ArrowLeftRight },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const hydrated = useHydrated()
  const { items } = useReviewInbox()
  const native = hydrated && nativeCapture.isNative()
  const visibleItems = navItems

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg dark:border-zinc-800 dark:bg-zinc-900/95 lg:hidden">
      <div className="mx-auto flex max-w-lg px-1">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href === "/settings" && pathname.startsWith("/settings/")) || (href === "/transactions" && pathname === "/inbox")
          return (
            <Link
              key={href}
              href={href}
              replace={native}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-xs transition-colors",
                isActive
                  ? "font-semibold text-zinc-950 dark:text-white"
                  : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              <span className={cn("flex h-8 min-w-11 items-center justify-center rounded-full transition-colors", isActive && "bg-zinc-200 dark:bg-zinc-700")}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs">{label}{href === "/transactions" && items.length > 0 && <span className="ml-1 rounded-full bg-amber-700 px-1 text-white" aria-label={`${items.length} waiting for review`}>{items.length}</span>}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

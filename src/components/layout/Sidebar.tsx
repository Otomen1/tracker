"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, ArrowLeftRight, Tag, Wallet, CalendarDays, CalendarRange, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/annual", label: "Annual", icon: CalendarDays },
  { href: "/monthly", label: "Monthly", icon: CalendarRange },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-zinc-900 text-zinc-100 fixed left-0 top-0 bottom-0 z-40">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
        <div className="w-7 h-7 rounded-md bg-white flex items-center justify-center">
          <Wallet className="w-4 h-4 text-zinc-900" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Expense Tracker</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-white text-zinc-900 font-medium"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-5 py-4 border-t border-zinc-800">
        <p className="text-xs text-zinc-500">Data stored locally</p>
      </div>
    </aside>
  )
}

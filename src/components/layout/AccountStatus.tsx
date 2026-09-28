"use client"

import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/nextjs"
import { useEffect } from "react"

function EnabledAccountStatus() {
  const { isLoaded, isSignedIn, user } = useUser()
  useEffect(() => {
    if (isLoaded) window.dispatchEvent(new CustomEvent("tracker-auth-change", { detail: { userId: user?.id ?? null } }))
  }, [isLoaded, isSignedIn, user?.id])
  return (
    <div className="fixed right-3 top-14 z-40 flex min-h-9 items-center rounded-full border border-zinc-200 bg-white/95 px-2.5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95 lg:right-5">
      <SignedOut><SignInButton mode="modal"><button type="button" className="text-xs font-medium text-zinc-700 dark:text-zinc-200">Sign in</button></SignInButton></SignedOut>
      <SignedIn><UserButton /></SignedIn>
    </div>
  )
}

export function AccountStatus() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_TRACKER_AUTH_DISABLED === "1") return null
  return <EnabledAccountStatus />
}

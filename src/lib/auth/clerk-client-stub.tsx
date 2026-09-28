"use client"

export function ClerkProvider({ children }: { children: React.ReactNode }) { return children }
export function SignInButton({ children }: { children: React.ReactNode; mode?: string }) { return children }
export function UserButton() { return null }
export function useUser() { return { isLoaded: true, isSignedIn: false, user: null } }

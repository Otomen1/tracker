"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import { useVault } from "@/context/VaultContext"
import { DEFAULT_ANDROID_ACCOUNTS } from "@/lib/constants"
import type { Account } from "@/types"

export type AccountInput = Pick<Account, "name" | "currency" | "isActive" | "kind">
interface AccountsContextValue {
  addAccount: (input: AccountInput) => Promise<boolean>
  accounts: Account[]
  androidSetupComplete: boolean
  initializeAndroidAccounts: () => Promise<boolean>
  updateAccount: (id: string, patch: Partial<AccountInput>) => Promise<boolean>
}

const AccountsContext = createContext<AccountsContextValue | null>(null)


export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate } = useVault()
  const accounts = data.accounts

  const initializeAndroidAccounts = useCallback(() => {
    const now = new Date().toISOString()
    const next = DEFAULT_ANDROID_ACCOUNTS.map((account) => ({
      ...account,
      openingBalance: 0,
      createdAt: now,
      updatedAt: now,
    }))
    return mutate((current) => ({ ...current, accounts: [...current.accounts, ...next.filter(a => !current.accounts.some(old => old.id === a.id))], androidSetupComplete: true }))
  }, [mutate])

  const addAccount = useCallback((input: AccountInput) => mutate(current => {
    if (current.accounts.length && input.currency !== current.accounts[0].currency) throw new Error("Use the same currency as your existing accounts. Mixed-currency totals are not supported.")
    const now = new Date().toISOString()
    return { ...current, accounts: [...current.accounts, { ...input, openingBalance: 0, id: crypto.randomUUID(), createdAt: now, updatedAt: now }] }
  }), [mutate])

  const updateAccount = useCallback((id: string, patch: Partial<AccountInput>) => mutate((current) => ({
    ...current,
    accounts: current.accounts.map((account) => account.id === id
      ? { ...account, ...patch, updatedAt: new Date().toISOString() }
      : account),
  })), [mutate])

  const value = useMemo<AccountsContextValue>(() => ({
    accounts,
    addAccount,
    androidSetupComplete: data.androidSetupComplete,
    initializeAndroidAccounts,
    updateAccount,
  }), [accounts, addAccount, data.androidSetupComplete, initializeAndroidAccounts, updateAccount])

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
}

export function useAccounts() {
  const context = useContext(AccountsContext)
  if (!context) throw new Error("useAccounts must be used within AccountsProvider")
  return context
}

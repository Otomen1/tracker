"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import { useVault } from "@/context/VaultContext"
import { DEFAULT_ANDROID_ACCOUNTS } from "@/lib/constants"
import type { Account, Transaction } from "@/types"

interface AccountInput {
  name: string
  currency: string
  openingBalance: number
  isActive: boolean
}

interface AccountsContextValue {
  accounts: Account[]
  androidSetupComplete: boolean
  initializeAndroidAccounts: (balances: { ryt: number; maybank: number }) => Promise<boolean>
  updateAccount: (id: string, patch: Partial<AccountInput>) => Promise<boolean>
  getBalance: (id: string, transactions: Transaction[]) => number
}

const AccountsContext = createContext<AccountsContextValue | null>(null)

export function calculateAccountBalance(account: Account, transactions: Transaction[]): number {
  const movement = transactions.reduce((sum, item) => {
    if (item.type === "income" && item.accountId === account.id) return sum + item.amount
    if (item.type === "expense" && item.accountId === account.id) return sum - item.amount
    if (item.type === "transfer" && item.fromAccountId === account.id) return sum - item.amount
    if (item.type === "transfer" && item.toAccountId === account.id) return sum + item.amount
    return sum
  }, 0)
  return Math.round((account.openingBalance + movement + Number.EPSILON) * 100) / 100
}

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const { data, mutate } = useVault()
  const accounts = data.accounts

  const initializeAndroidAccounts = useCallback((balances: { ryt: number; maybank: number }) => {
    const now = new Date().toISOString()
    const next = DEFAULT_ANDROID_ACCOUNTS.map((account) => ({
      ...account,
      openingBalance: account.id === "account_ryt" ? balances.ryt : balances.maybank,
      createdAt: now,
      updatedAt: now,
    }))
    return mutate((current) => ({ ...current, accounts: next, androidSetupComplete: true }))
  }, [mutate])

  const updateAccount = useCallback((id: string, patch: Partial<AccountInput>) => mutate((current) => ({
    ...current,
    accounts: current.accounts.map((account) => account.id === id
      ? { ...account, ...patch, updatedAt: new Date().toISOString() }
      : account),
  })), [mutate])

  const value = useMemo<AccountsContextValue>(() => ({
    accounts,
    androidSetupComplete: data.androidSetupComplete,
    initializeAndroidAccounts,
    updateAccount,
    getBalance: (id, transactions) => {
      const account = accounts.find((item) => item.id === id)
      return account ? calculateAccountBalance(account, transactions) : 0
    },
  }), [accounts, data.androidSetupComplete, initializeAndroidAccounts, updateAccount])

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
}

export function useAccounts() {
  const context = useContext(AccountsContext)
  if (!context) throw new Error("useAccounts must be used within AccountsProvider")
  return context
}

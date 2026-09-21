"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { DEFAULT_ANDROID_ACCOUNTS, STORAGE_KEYS } from "@/lib/constants"
import { Account, Transaction } from "@/types"

interface AccountInput {
  name: string
  currency: string
  openingBalance: number
  isActive: boolean
}

interface AccountsContextValue {
  accounts: Account[]
  androidSetupComplete: boolean
  initializeAndroidAccounts: (balances: { ryt: number; maybank: number }) => boolean
  updateAccount: (id: string, patch: Partial<AccountInput>) => boolean
  getBalance: (id: string, transactions: Transaction[]) => number
}

const AccountsContext = createContext<AccountsContextValue | null>(null)
const SAME_TAB_EVENT = "tracker-storage-change"

function readAccounts(): Account[] {
  if (typeof window === "undefined") return []
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACCOUNTS) ?? "[]")
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

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
  const [accounts, setAccounts] = useState<Account[]>(readAccounts)
  const [androidSetupComplete, setAndroidSetupComplete] = useState(false)
  const currentRef = useRef(accounts)

  const replace = useCallback((raw: string | null) => {
    try {
      const next = JSON.parse(raw ?? "[]")
      if (!Array.isArray(next)) return
      currentRef.current = next
      setAccounts(next)
    } catch { /* storage recovery handles malformed data */ }
  }, [])

  useEffect(() => {
    replace(localStorage.getItem(STORAGE_KEYS.ACCOUNTS))
    setAndroidSetupComplete(localStorage.getItem(STORAGE_KEYS.ANDROID_SETUP) === "1")
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === STORAGE_KEYS.ACCOUNTS) replace(event.newValue)
    }
    const onSameTab = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: string }>).detail
      if (detail?.key === STORAGE_KEYS.ACCOUNTS) replace(detail.value)
    }
    window.addEventListener("storage", onStorage)
    window.addEventListener(SAME_TAB_EVENT, onSameTab)
    return () => {
      window.removeEventListener("storage", onStorage)
      window.removeEventListener(SAME_TAB_EVENT, onSameTab)
    }
  }, [replace])

  const persist = useCallback((next: Account[]): boolean => {
    try {
      const serialized = JSON.stringify(next)
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, serialized)
      currentRef.current = next
      setAccounts(next)
      window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, { detail: { key: STORAGE_KEYS.ACCOUNTS, value: serialized } }))
      return true
    } catch {
      window.dispatchEvent(new CustomEvent("storage-write-failed"))
      return false
    }
  }, [])

  const initializeAndroidAccounts = useCallback((balances: { ryt: number; maybank: number }) => {
    const now = new Date().toISOString()
    const next = DEFAULT_ANDROID_ACCOUNTS.map((account) => ({
      ...account,
      openingBalance: account.id === "account_ryt" ? balances.ryt : balances.maybank,
      createdAt: now,
      updatedAt: now,
    }))
    if (!persist(next)) return false
    localStorage.setItem(STORAGE_KEYS.ANDROID_SETUP, "1")
    setAndroidSetupComplete(true)
    return true
  }, [persist])

  const updateAccount = useCallback((id: string, patch: Partial<AccountInput>) => persist(
    currentRef.current.map((account) => account.id === id
      ? { ...account, ...patch, updatedAt: new Date().toISOString() }
      : account)
  ), [persist])

  const value = useMemo<AccountsContextValue>(() => ({
    accounts,
    androidSetupComplete,
    initializeAndroidAccounts,
    updateAccount,
    getBalance: (id, transactions) => {
      const account = accounts.find((item) => item.id === id)
      return account ? calculateAccountBalance(account, transactions) : 0
    },
  }), [accounts, androidSetupComplete, initializeAndroidAccounts, updateAccount])

  return <AccountsContext.Provider value={value}>{children}</AccountsContext.Provider>
}

export function useAccounts() {
  const context = useContext(AccountsContext)
  if (!context) throw new Error("useAccounts must be used within AccountsProvider")
  return context
}

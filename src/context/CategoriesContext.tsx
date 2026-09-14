"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { DEFAULT_CATEGORIES, STORAGE_KEYS } from "@/lib/constants"
import { Category, CategoryFormData, TransactionType } from "@/types"

interface CategoriesContextValue {
  categories: Category[]
  addCategory: (data: CategoryFormData) => Category | null
  updateCategory: (id: string, data: Partial<CategoryFormData>) => boolean
  deleteCategory: (id: string, transactions: { categoryId: string }[]) => { success: boolean; error?: string }
  getCategoriesForType: (type: TransactionType) => Category[]
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)
const SAME_TAB_EVENT = "tracker-storage-change"

function readCategories(): Category[] {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.CATEGORIES) ?? "null")
    return Array.isArray(parsed) ? parsed : DEFAULT_CATEGORIES
  } catch {
    return DEFAULT_CATEGORIES
  }
}

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(readCategories)
  const currentRef = useRef(categories)

  const replaceFromStorage = useCallback((raw: string | null) => {
    try {
      const next = raw === null ? DEFAULT_CATEGORIES : JSON.parse(raw)
      if (!Array.isArray(next)) return
      currentRef.current = next
      setCategories(next)
    } catch {
      // The storage recovery banner reports malformed persisted data.
    }
  }, [])

  useEffect(() => {
    // Hydration starts with defaults because localStorage is unavailable on the
    // server. Refresh from the browser before accepting user mutations.
    replaceFromStorage(localStorage.getItem(STORAGE_KEYS.CATEGORIES))
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === STORAGE_KEYS.CATEGORIES) {
        replaceFromStorage(event.newValue)
      }
    }
    const handleSameTab = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; value: string }>).detail
      if (detail?.key === STORAGE_KEYS.CATEGORIES) replaceFromStorage(detail.value)
    }
    window.addEventListener("storage", handleStorage)
    window.addEventListener(SAME_TAB_EVENT, handleSameTab)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(SAME_TAB_EVENT, handleSameTab)
    }
  }, [replaceFromStorage])

  const mutate = useCallback((mutation: (current: Category[]) => Category[]): boolean => {
    const current = currentRef.current
    const next = mutation(current)
    if (next === current || JSON.stringify(next) === JSON.stringify(current)) return true
    try {
      const serialized = JSON.stringify(next)
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, serialized)
      currentRef.current = next
      setCategories(next)
      window.dispatchEvent(new CustomEvent(SAME_TAB_EVENT, {
        detail: { key: STORAGE_KEYS.CATEGORIES, value: serialized },
      }))
      return true
    } catch (error) {
      const quotaExceeded = error instanceof DOMException && error.name === "QuotaExceededError"
      window.dispatchEvent(new CustomEvent(quotaExceeded ? "storage-quota-exceeded" : "storage-write-failed"))
      return false
    }
  }, [])

  const addCategory = useCallback((data: CategoryFormData): Category | null => {
    const category: Category = {
      id: `cat_${crypto.randomUUID()}`,
      name: data.name,
      type: data.type,
      color: data.color,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    return mutate((current) => [...current, category]) ? category : null
  }, [mutate])

  const updateCategory = useCallback((id: string, data: Partial<CategoryFormData>) =>
    mutate((current) => current.map((category) => category.id === id ? { ...category, ...data } : category)),
  [mutate])

  const deleteCategory = useCallback((id: string, transactions: { categoryId: string }[]) => {
    const category = currentRef.current.find((item) => item.id === id)
    if (!category) return { success: false, error: "Category not found" }
    if (category.isDefault) return { success: false, error: "Cannot delete default categories" }
    if (transactions.some((transaction) => transaction.categoryId === id)) {
      return { success: false, error: "Category is used by existing transactions" }
    }
    return mutate((current) => current.filter((item) => item.id !== id))
      ? { success: true }
      : { success: false, error: "Category could not be saved" }
  }, [mutate])

  const getCategoriesForType = useCallback((type: TransactionType) =>
    currentRef.current.filter((category) => category.type === type), [])

  return (
    <CategoriesContext.Provider value={{ categories, addCategory, updateCategory, deleteCategory, getCategoriesForType }}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategoriesContext() {
  const context = useContext(CategoriesContext)
  if (!context) throw new Error("useCategories must be used within CategoriesProvider")
  return context
}

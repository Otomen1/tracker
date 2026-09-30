"use client"

import { createContext, useCallback, useContext, useMemo } from "react"
import { useVault } from "@/context/VaultContext"
import type { Category, CategoryFormData, EntryType } from "@/types"

interface CategoriesContextValue {
  categories: Category[]
  addCategory: (data: CategoryFormData) => Promise<Category | null>
  updateCategory: (id: string, data: Partial<CategoryFormData>) => Promise<boolean>
  deleteCategory: (id: string, transactions: { categoryId: string }[]) => Promise<{ success: boolean; error?: string }>
  getCategoriesForType: (type: EntryType) => Category[]
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null)

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const { data: vault, mutate } = useVault()
  const categories = vault.categories

  const addCategory = useCallback(async (data: CategoryFormData) => {
    const category: Category = {
      id: `cat_${crypto.randomUUID()}`,
      name: data.name,
      type: data.type,
      color: data.color,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    const saved = await mutate((current) => ({ ...current, categories: [...current.categories, category] }))
    return saved ? category : null
  }, [mutate])

  const updateCategory = useCallback((id: string, patch: Partial<CategoryFormData>) => mutate((current) => ({
    ...current,
    categories: current.categories.map((category) => category.id === id ? { ...category, ...patch } : category),
  })), [mutate])

  const deleteCategory = useCallback(async (id: string, transactions: { categoryId: string }[]) => {
    const category = categories.find((item) => item.id === id)
    if (!category) return { success: false, error: "Category not found" }
    if (category.isDefault) return { success: false, error: "Cannot delete default categories" }
    if (transactions.some((transaction) => transaction.categoryId === id)) {
      return { success: false, error: "Category is used by existing transactions" }
    }
    return await mutate((current) => ({
      ...current,
      categories: current.categories.filter((item) => item.id !== id),
    })) ? { success: true } : { success: false, error: "Category could not be saved" }
  }, [categories, mutate])

  const getCategoriesForType = useCallback((type: EntryType) =>
    categories.filter((category) => category.type === type), [categories])

  const value = useMemo(() => ({ categories, addCategory, updateCategory, deleteCategory, getCategoriesForType }), [
    categories, addCategory, updateCategory, deleteCategory, getCategoriesForType,
  ])

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategoriesContext() {
  const context = useContext(CategoriesContext)
  if (!context) throw new Error("useCategories must be used within CategoriesProvider")
  return context
}

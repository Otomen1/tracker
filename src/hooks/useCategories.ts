"use client"

import { useEffect } from "react"
import { Category, CategoryFormData, TransactionType } from "@/types"
import { useLocalStorage } from "./useLocalStorage"
import { DEFAULT_CATEGORIES, STORAGE_KEYS } from "@/lib/constants"

export function useCategories() {
  const [categories, setCategories] = useLocalStorage<Category[]>(
    STORAGE_KEYS.CATEGORIES,
    []
  )

  useEffect(() => {
    if (typeof window === "undefined") return
    const stored = localStorage.getItem(STORAGE_KEYS.CATEGORIES)
    if (!stored || JSON.parse(stored).length === 0) {
      setCategories(DEFAULT_CATEGORIES)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const addCategory = (data: CategoryFormData): Category => {
    const newCategory: Category = {
      id: `cat_${crypto.randomUUID()}`,
      name: data.name,
      type: data.type,
      color: data.color,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }
    setCategories((prev) => [...prev, newCategory])
    return newCategory
  }

  const updateCategory = (id: string, data: Partial<CategoryFormData>): void => {
    setCategories((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, ...data } : c
      )
    )
  }

  const deleteCategory = (
    id: string,
    transactions: { categoryId: string }[]
  ): { success: boolean; error?: string } => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return { success: false, error: "Category not found" }
    if (cat.isDefault) return { success: false, error: "Cannot delete default categories" }
    const inUse = transactions.some((t) => t.categoryId === id)
    if (inUse) return { success: false, error: "Category is used by existing transactions" }
    setCategories((prev) => prev.filter((c) => c.id !== id))
    return { success: true }
  }

  const getCategoriesForType = (type: TransactionType): Category[] => {
    return categories.filter((c) => c.type === type || c.type === "both")
  }

  return { categories, addCategory, updateCategory, deleteCategory, getCategoriesForType }
}

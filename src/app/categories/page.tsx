"use client"

import { useTransactions } from "@/hooks/useTransactions"
import { useCategories } from "@/hooks/useCategories"
import { CategoryList } from "@/components/categories/CategoryList"
import { Separator } from "@/components/ui/separator"

export default function CategoriesPage() {
  const { transactions } = useTransactions()
  const { categories, addCategory, updateCategory, deleteCategory } = useCategories()

  const incomeCategories = categories.filter((c) => c.type === "income")
  const expenseCategories = categories.filter((c) => c.type === "expense")

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Categories</h1>

      <div className="bg-white/70 dark:bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 p-5 space-y-6">
        <CategoryList
          title="Income"
          type="income"
          categories={incomeCategories}
          transactions={transactions}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onDelete={(id) => deleteCategory(id, transactions)}
        />

        <Separator />

        <CategoryList
          title="Expenses"
          type="expense"
          categories={expenseCategories}
          transactions={transactions}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onDelete={(id) => deleteCategory(id, transactions)}
        />
      </div>
    </div>
  )
}

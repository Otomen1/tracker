"use client"

import { useCallback } from "react"
import { useCategories } from "@/hooks/useCategories"
import { useSettingsContext } from "@/context/SettingsContext"
import { useToast } from "@/context/ToastContext"
import { getBudgetStatus } from "@/lib/analytics"
import { getMonthKey } from "@/lib/formatters"
import { Transaction, TransactionFormData } from "@/types"

export function useBudgetCheck() {
  const { categories } = useCategories()
  const { fmt } = useSettingsContext()
  const { showToast } = useToast()

  const checkBudget = useCallback((data: TransactionFormData, baseTransactions: Transaction[]) => {
    const currentMonth = getMonthKey()
    if (data.type !== "expense" || !data.date.startsWith(currentMonth)) return

    const hypothetical: Transaction[] = [
      ...baseTransactions,
      {
        id: "_budget_check",
        type: data.type,
        amount: parseFloat(data.amount),
        categoryId: data.categoryId,
        description: data.description,
        date: data.date,
        createdAt: "",
        updatedAt: "",
      },
    ]

    const budgets = getBudgetStatus(hypothetical, currentMonth, categories)
    const b = budgets.find((b) => b.categoryId === data.categoryId)
    if (!b) return

    if (b.isOverBudget) {
      showToast(
        `${b.categoryName} is over budget — ${fmt(b.spent)} of ${fmt(b.budget)} spent`,
        "error"
      )
    } else if (b.percentage >= 80) {
      showToast(
        `${b.categoryName} is at ${Math.round(b.percentage)}% of budget`,
        "warning"
      )
    }
  }, [categories, fmt, showToast])

  return { checkBudget }
}

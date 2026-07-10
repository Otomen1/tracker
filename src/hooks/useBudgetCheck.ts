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

  // Shared by both entry points below so the over-budget/warning thresholds
  // and messages exist in exactly one place.
  const warnIfOverBudget = useCallback((categoryId: string, transactions: Transaction[], periodKey: string) => {
    const budgets = getBudgetStatus(transactions, periodKey, categories)
    const b = budgets.find((b) => b.categoryId === categoryId)
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

    warnIfOverBudget(data.categoryId, hypothetical, currentMonth)
  }, [warnIfOverBudget])

  // For a bulk recategorize, the mutation has already happened - there's no
  // "hypothetical" transaction to append, just the real resulting state to
  // evaluate once for the target category. One call regardless of how many
  // transactions were moved into it.
  const checkBudgetForCategory = useCallback((categoryId: string, transactions: Transaction[]) => {
    warnIfOverBudget(categoryId, transactions, getMonthKey())
  }, [warnIfOverBudget])

  return { checkBudget, checkBudgetForCategory }
}

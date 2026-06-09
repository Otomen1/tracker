export type TransactionType = "income" | "expense"

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  description: string
  date: string // "YYYY-MM-DD"
  createdAt: string
  updatedAt: string
}

export type CategoryType = "income" | "expense" | "both"

export interface Category {
  id: string
  name: string
  type: CategoryType
  color: string // hex color
  isDefault: boolean
  createdAt: string
}

export interface MonthlySummary {
  month: string // "YYYY-MM"
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  color: string
  total: number
  percentage: number
  count: number
}

export interface DashboardStats {
  currentMonthIncome: number
  currentMonthExpenses: number
  currentMonthNet: number
  allTimeBalance: number
  previousMonthIncome: number
  previousMonthExpenses: number
  transactionCountThisMonth: number
}

export interface TransactionFormData {
  type: TransactionType
  amount: string
  categoryId: string
  description: string
  date: string
}

export interface CategoryFormData {
  name: string
  type: "income" | "expense"
  color: string
}

export interface TransactionFilters {
  type?: TransactionType | ""
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
}

export type TransactionType = "income" | "expense"

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  categoryId: string
  description: string
  date: string // "YYYY-MM-DD"
  notes?: string
  tags?: string[]
  isRecurring?: boolean
  recurringDay?: number // 1–31
  recurringId?: string  // id of the template transaction this was auto-generated from
  createdAt: string
  updatedAt: string
}

export type CategoryType = "income" | "expense"

export interface Category {
  id: string
  name: string
  type: CategoryType
  color: string
  isDefault: boolean
  budget?: number // monthly budget limit
  createdAt: string
}

export interface Settings {
  currency: string
  theme: "light" | "dark" | "system"
  monthlySavingsGoal: number
  backupInterval?: "never" | "daily" | "weekly" | "monthly"
  lastBackupAt?: string
  reminderEnabled?: boolean
  reminderTime?: string // "HH:MM"
}

export interface MonthlySummary {
  month: string // "YYYY-MM"
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
}

export interface SavingsTrendPoint {
  month: string // "YYYY-MM"
  actual: number // net savings (income - expenses) for that month
  goal: number // the applicable monthly goal; 0 if none configured
  achievementRate: number | null // actual/goal * 100; null when goal <= 0
}

export interface SavingsTrendResult {
  points: SavingsTrendPoint[]
  totalActual: number // summed over elapsed months only
  totalGoal: number // goal * elapsed month count; 0 if no goal
  achievementRate: number | null // totalActual/totalGoal * 100; null when totalGoal <= 0
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  color: string
  total: number
  percentage: number
  count: number
}

export interface BudgetStatus {
  categoryId: string
  categoryName: string
  color: string
  budget: number
  spent: number
  percentage: number
  isOverBudget: boolean
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

export interface AnnualSummary {
  year: number
  totalIncome: number
  totalExpenses: number
  netBalance: number
  monthlyBreakdown: MonthlySummary[]
  topExpenseCategories: CategoryBreakdown[]
}

export interface TransactionFormData {
  type: TransactionType
  amount: string
  categoryId: string
  description: string
  date: string
  notes?: string
  tags?: string[]
  isRecurring?: boolean
  recurringDay?: number
}

export interface CategoryFormData {
  name: string
  type: "income" | "expense"
  color: string
  budget?: number
}

export interface Insight {
  id: string
  type: "positive" | "warning" | "negative" | "neutral"
  title: string
  detail?: string
}

export interface TransactionFilters {
  type?: TransactionType | ""
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  tag?: string
  minAmount?: number
  maxAmount?: number
  recurring?: boolean
}

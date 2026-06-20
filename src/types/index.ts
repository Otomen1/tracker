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

export type CategoryType = "income" | "expense" | "both"

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

export interface TransactionFilters {
  type?: TransactionType | ""
  categoryId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  tag?: string
  minAmount?: number
  maxAmount?: number
}

// ─── Savings Goals ───────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string // "YYYY-MM-DD"
  color: string
  createdAt: string
  updatedAt: string
}

export interface SavingsGoalFormData {
  name: string
  targetAmount: string
  currentAmount: string
  targetDate?: string
  color: string
}

// ─── Soft-delete / Recycle Bin ───────────────────────────────────────────────

export interface DeletedTransaction extends Transaction {
  deletedAt: string
}

// ─── Subscription Detection ──────────────────────────────────────────────────

export interface DetectedSubscription {
  key: string
  description: string
  amount: number
  categoryId: string
  occurrences: number
  firstSeen: string
  lastSeen: string
  monthlyTotal: number
  yearlyTotal: number
  status: "detected" | "confirmed" | "rejected"
}

// ─── Financial Insights ──────────────────────────────────────────────────────

export type InsightSeverity = "info" | "warning" | "success" | "danger"

export interface FinancialInsight {
  id: string
  severity: InsightSeverity
  title: string
  description: string
  value?: string
}

// ─── Cash Flow Forecast ──────────────────────────────────────────────────────

export interface CashFlowForecast {
  month: string
  expectedIncome: number
  expectedExpenses: number
  projectedSavings: number
  projectedEndBalance: number
  confidence: "high" | "medium" | "low"
  basedOnMonths: number
}

// ─── Financial Health Score ──────────────────────────────────────────────────

export interface HealthScoreFactor {
  score: number
  maxScore: number
  label: string
  detail: string
}

export interface FinancialHealthScore {
  total: number
  grade: "A" | "B" | "C" | "D" | "F"
  factors: {
    savingsRate: HealthScoreFactor
    budgetCompliance: HealthScoreFactor
    expenseConsistency: HealthScoreFactor
    goalProgress: HealthScoreFactor
    spendingTrend: HealthScoreFactor
  }
  strengths: string[]
  improvements: string[]
}

// ─── Category Analytics ──────────────────────────────────────────────────────

export interface CategoryAnalytics {
  categoryId: string
  categoryName: string
  color: string
  type: CategoryType
  budget?: number
  currentMonthTotal: number
  lastMonthTotal: number
  monthlyAverage: number
  annualTotal: number
  budgetUsagePct: number | null
  trend: "up" | "down" | "stable"
  transactionCount: number
}

// ─── Monthly Report ──────────────────────────────────────────────────────────

export interface MonthlyReport {
  month: string
  totalIncome: number
  totalExpenses: number
  netSavings: number
  savingsRate: number
  topCategories: CategoryBreakdown[]
  largestExpenses: Transaction[]
  largestIncome: Transaction[]
  budgetPerformance: BudgetStatus[]
  comparison: {
    prevIncome: number
    prevExpenses: number
    prevSavings: number
    incomeChangePct: number | null
    expenseChangePct: number | null
    savingsChangePct: number | null
  } | null
}

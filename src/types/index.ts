export type EntryType = "income" | "expense"
export type TransactionType = EntryType | "transfer"
export type AccountKind = "bank" | "cash" | "ewallet" | "credit_card"

export interface Account {
  id: string
  name: string
  currency: string
  openingBalance: number // legacy storage compatibility only; no longer used or editable
  isActive: boolean
  createdAt: string
  updatedAt: string
  kind?: AccountKind // omitted in legacy records; interpreted as bank
  creditLimit?: number // legacy backup field; no longer used or editable
  lastFour?: string
  statementBalance?: number // legacy backup field; no longer used or editable
  statementDate?: string
  dueDate?: string
}

export interface NotificationSource {
  provider: "ryt" | "mae" | "google_wallet"
  fingerprint: string
  capturedAt: string
}

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
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  notificationSource?: NotificationSource
  linkedNotifications?: NotificationSource[]
  isRefund?: boolean // income on a credit card, reverses spending
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
  commandId?: string // stable across retries of one editor session
  type: TransactionType
  amount: string
  categoryId: string
  description: string
  date: string
  notes?: string
  tags?: string[]
  isRecurring?: boolean
  recurringDay?: number
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  isRefund?: boolean
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
  accountId?: string
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

export interface PendingTransaction {
  id: string
  provider: "ryt" | "mae"
  fingerprint: string
  direction: EntryType
  amount: number
  description: string
  occurredAt: string
  capturedAt: string
  accountId: string
}

export interface WalletCardMapping {
  id: string
  cardLastFour: string
  accountId: string
  enabled: boolean
}

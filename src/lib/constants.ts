import { Category, Settings } from "@/types"

const EPOCH = "2024-01-01T00:00:00.000Z"

export const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat_salary", name: "Salary", type: "income", color: "#22c55e", isDefault: true, createdAt: EPOCH },
  { id: "cat_freelance", name: "Freelance", type: "income", color: "#3b82f6", isDefault: true, createdAt: EPOCH },
  { id: "cat_investment", name: "Investment", type: "income", color: "#8b5cf6", isDefault: true, createdAt: EPOCH },
  { id: "cat_income_other", name: "Other Income", type: "income", color: "#6b7280", isDefault: true, createdAt: EPOCH },
  { id: "cat_food", name: "Food", type: "expense", color: "#f97316", isDefault: true, createdAt: EPOCH },
  { id: "cat_transport", name: "Transport", type: "expense", color: "#eab308", isDefault: true, createdAt: EPOCH },
  { id: "cat_entertainment", name: "Entertainment", type: "expense", color: "#ec4899", isDefault: true, createdAt: EPOCH },
  { id: "cat_health", name: "Health", type: "expense", color: "#14b8a6", isDefault: true, createdAt: EPOCH },
  { id: "cat_shopping", name: "Shopping", type: "expense", color: "#f43f5e", isDefault: true, createdAt: EPOCH },
  { id: "cat_bills", name: "Bills", type: "expense", color: "#64748b", isDefault: true, createdAt: EPOCH },
  { id: "cat_expense_other", name: "Other", type: "expense", color: "#9ca3af", isDefault: true, createdAt: EPOCH },
]

export const STORAGE_KEYS = {
  TRANSACTIONS: "tracker_transactions",
  CATEGORIES: "tracker_categories",
  SCHEMA_VERSION: "tracker_schema_version",
  SETTINGS: "tracker_settings",
} as const

export const SCHEMA_VERSION = "1"

export const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#64748b",
  "#6b7280", "#0ea5e9",
]

export const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp" },
  { code: "THB", name: "Thai Baht", symbol: "฿" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
]

export const DEFAULT_SETTINGS: Settings = {
  currency: "USD",
  theme: "system",
  monthlySavingsGoal: 0,
  backupInterval: "never",
}

export const PAGE_SIZE = 25
export const RECENT_TRANSACTIONS_COUNT = 5
export const MONTHS_IN_CHART = 6
export const TOP_TRANSACTIONS_COUNT = 8
export const PIE_CHART_MAX_CATEGORIES = 4
export const BACKUP_MAX_FILE_SIZE_MB = 5
export const UNDO_TIMEOUT_MS = 4000

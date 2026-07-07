"use client"

import { useEffect, useRef, useState } from "react"
import { TransactionFilters, Category, TransactionType } from "@/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, X, RefreshCw, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  filters: TransactionFilters
  categories: Category[]
  tags: string[]
  fmt: (n: number) => string
  onChange: (filters: TransactionFilters) => void
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-xs">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}

export function TransactionFiltersBar({ filters, categories, tags, fmt, onChange }: Props) {
  const [search, setSearch] = useState(filters.search ?? "")
  const [minAmount, setMinAmount] = useState(filters.minAmount !== undefined ? String(filters.minAmount) : "")
  const [maxAmount, setMaxAmount] = useState(filters.maxAmount !== undefined ? String(filters.maxAmount) : "")
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const filtersRef = useRef(filters)
  filtersRef.current = filters
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useEffect(() => {
    const timer = setTimeout(() => {
      onChangeRef.current({ ...filtersRef.current, search })
    }, 200)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const timer = setTimeout(() => {
      const min = minAmount !== "" ? parseFloat(minAmount) : undefined
      const max = maxAmount !== "" ? parseFloat(maxAmount) : undefined
      onChangeRef.current({ ...filtersRef.current, minAmount: isNaN(min!) ? undefined : min, maxAmount: isNaN(max!) ? undefined : max })
    }, 300)
    return () => clearTimeout(timer)
  }, [minAmount, maxAmount])

  const hasFilters =
    filters.type ||
    filters.categoryId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search ||
    filters.tag ||
    filters.minAmount !== undefined ||
    filters.maxAmount !== undefined ||
    filters.recurring

  const filteredCategories =
    filters.type
      ? categories.filter((c) => c.type === filters.type)
      : categories

  // Only the filters tucked behind "More Filters" count toward its badge —
  // search/type/date are already visible, so counting them here would be redundant.
  const advancedFilterCount = [
    filters.categoryId,
    filters.tag,
    filters.minAmount !== undefined ? "1" : "",
    filters.maxAmount !== undefined ? "1" : "",
    filters.recurring ? "1" : "",
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearch("")
    setMinAmount("")
    setMaxAmount("")
    onChange({})
    setAdvancedOpen(false)
  }

  const toggleRecurring = () =>
    onChange({ ...filters, recurring: filters.recurring ? undefined : true })

  const activeCategory = filters.categoryId
    ? categories.find((c) => c.id === filters.categoryId)
    : undefined

  return (
    <div className="space-y-2">
      {/* Always visible: search, type, date range, plus the advanced-filters toggle */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          className="flex-1 min-w-[140px] sm:flex-none sm:w-44 h-9 text-sm"
          placeholder="Search..."
          aria-label="Search transactions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          value={filters.type ?? "all"}
          onValueChange={(v) =>
            onChange({ ...filters, type: v === "all" ? "" : (v as TransactionType), categoryId: "" })
          }
        >
          <SelectTrigger className="w-full sm:w-32 h-9 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-full sm:w-36 h-9 text-sm"
          aria-label="From date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        />
        <Input
          type="date"
          className="w-full sm:w-36 h-9 text-sm"
          aria-label="To date"
          value={filters.dateTo ?? ""}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        />

        <Button
          variant={advancedOpen ? "secondary" : "outline"}
          size="sm"
          className="h-9 shrink-0"
          aria-expanded={advancedOpen}
          aria-controls="transaction-advanced-filters"
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
          More Filters
          {advancedFilterCount > 0 && (
            <span className="ml-1.5 text-xs font-semibold text-primary">({advancedFilterCount})</span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 ml-1 transition-transform", advancedOpen && "rotate-180")} />
        </Button>

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            onClick={clearFilters}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Advanced filters — kept in the DOM (display toggled) so aria-controls always
          resolves to a real element and the collapse is a pure visibility change. */}
      <div
        id="transaction-advanced-filters"
        className={cn("flex-wrap gap-2 items-center", advancedOpen ? "flex" : "hidden")}
      >
        <Select
          value={filters.categoryId ?? "all"}
          onValueChange={(v) =>
            onChange({ ...filters, categoryId: v === "all" ? "" : v })
          }
        >
          <SelectTrigger className="w-full sm:w-36 h-9 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {filteredCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  {c.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {tags.length > 0 && (
          <Select
            value={filters.tag ?? "all"}
            onValueChange={(v) => onChange({ ...filters, tag: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-full sm:w-32 h-9 text-sm">
              <SelectValue placeholder="All tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag} value={tag}>#{tag}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Input
          type="number"
          min="0"
          className="w-full sm:w-28 h-9 text-sm"
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
          placeholder="Min amount"
        />
        <Input
          type="number"
          min="0"
          className="w-full sm:w-28 h-9 text-sm"
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
          placeholder="Max amount"
        />

        <Button
          variant={filters.recurring ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5"
          onClick={toggleRecurring}
          aria-pressed={!!filters.recurring}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Recurring
        </Button>
      </div>

      {/* Active filter chips */}
      {hasFilters && (
        <div className="flex flex-wrap gap-1.5">
          {filters.type && (
            <FilterChip
              label={filters.type === "income" ? "Income" : "Expense"}
              onRemove={() => onChange({ ...filters, type: "" as TransactionType, categoryId: "" })}
            />
          )}
          {filters.categoryId && activeCategory && (
            <FilterChip
              label={activeCategory.name}
              onRemove={() => onChange({ ...filters, categoryId: "" })}
            />
          )}
          {filters.dateFrom && (
            <FilterChip
              label={`From: ${filters.dateFrom}`}
              onRemove={() => onChange({ ...filters, dateFrom: "" })}
            />
          )}
          {filters.dateTo && (
            <FilterChip
              label={`To: ${filters.dateTo}`}
              onRemove={() => onChange({ ...filters, dateTo: "" })}
            />
          )}
          {filters.search && (
            <FilterChip
              label={`"${filters.search}"`}
              onRemove={() => { setSearch(""); onChange({ ...filters, search: "" }) }}
            />
          )}
          {filters.tag && (
            <FilterChip
              label={`#${filters.tag}`}
              onRemove={() => onChange({ ...filters, tag: "" })}
            />
          )}
          {filters.minAmount !== undefined && (
            <FilterChip
              label={`Min: ${fmt(filters.minAmount)}`}
              onRemove={() => { setMinAmount(""); onChange({ ...filters, minAmount: undefined }) }}
            />
          )}
          {filters.maxAmount !== undefined && (
            <FilterChip
              label={`Max: ${fmt(filters.maxAmount)}`}
              onRemove={() => { setMaxAmount(""); onChange({ ...filters, maxAmount: undefined }) }}
            />
          )}
          {filters.recurring && (
            <FilterChip
              label="Recurring"
              onRemove={() => onChange({ ...filters, recurring: undefined })}
            />
          )}
        </div>
      )}
    </div>
  )
}

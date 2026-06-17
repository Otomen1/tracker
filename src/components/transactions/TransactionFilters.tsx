"use client"

import { useEffect, useRef, useState } from "react"
import { TransactionFilters, Category, TransactionType } from "@/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  filters: TransactionFilters
  categories: Category[]
  tags: string[]
  onChange: (filters: TransactionFilters) => void
}

export function TransactionFiltersBar({ filters, categories, tags, onChange }: Props) {
  const [search, setSearch] = useState(filters.search ?? "")
  const [minAmount, setMinAmount] = useState(filters.minAmount !== undefined ? String(filters.minAmount) : "")
  const [maxAmount, setMaxAmount] = useState(filters.maxAmount !== undefined ? String(filters.maxAmount) : "")
  const [mobileOpen, setMobileOpen] = useState(false)
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
    filters.maxAmount !== undefined

  const filteredCategories =
    filters.type
      ? categories.filter((c) => c.type === filters.type || c.type === "both")
      : categories

  const clearFilters = () => {
    setSearch("")
    setMinAmount("")
    setMaxAmount("")
    onChange({})
    setMobileOpen(false)
  }

  const filterControls = (
    <>
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
        type="date"
        className="w-full sm:w-36 h-9 text-sm"
        value={filters.dateFrom ?? ""}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        placeholder="From"
      />
      <Input
        type="date"
        className="w-full sm:w-36 h-9 text-sm"
        value={filters.dateTo ?? ""}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        placeholder="To"
      />

      <Input
        type="number"
        min="0"
        className="w-full sm:w-28 h-9 text-sm"
        value={minAmount}
        onChange={(e) => setMinAmount(e.target.value)}
        placeholder="Min $"
      />
      <Input
        type="number"
        min="0"
        className="w-full sm:w-28 h-9 text-sm"
        value={maxAmount}
        onChange={(e) => setMaxAmount(e.target.value)}
        placeholder="Max $"
      />

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-zinc-500 hover:text-zinc-900"
          onClick={clearFilters}
        >
          <X className="w-3.5 h-3.5 mr-1" />
          Clear
        </Button>
      )}
    </>
  )

  return (
    <div className="space-y-2">
      {/* Mobile: search + toggle */}
      <div className="flex items-center gap-2 sm:hidden">
        <Input
          className="flex-1 h-9 text-sm"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          variant={mobileOpen ? "secondary" : "outline"}
          size="sm"
          className="h-9 shrink-0"
          aria-pressed={mobileOpen}
          aria-label="Toggle filters"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5" />
          Filters
          {hasFilters && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-primary inline-block" />}
        </Button>
      </div>

      {/* Mobile expanded filters */}
      {mobileOpen && (
        <div className={cn("flex flex-wrap gap-2 items-center sm:hidden")}>
          {filterControls}
        </div>
      )}

      {/* Desktop: always visible */}
      <div className="hidden sm:flex flex-wrap gap-2 items-center">
        {filterControls}
        <Input
          className="w-44 h-9 text-sm"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
    </div>
  )
}

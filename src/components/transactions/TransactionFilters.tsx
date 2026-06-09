"use client"

import { useEffect, useState } from "react"
import { TransactionFilters, Category, TransactionType } from "@/types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface Props {
  filters: TransactionFilters
  categories: Category[]
  onChange: (filters: TransactionFilters) => void
}

export function TransactionFiltersBar({ filters, categories, onChange }: Props) {
  const [search, setSearch] = useState(filters.search ?? "")

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange({ ...filters, search })
    }, 200)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasFilters =
    filters.type ||
    filters.categoryId ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search

  const filteredCategories =
    filters.type
      ? categories.filter((c) => c.type === filters.type || c.type === "both")
      : categories

  const clearFilters = () => {
    setSearch("")
    onChange({})
  }

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Select
        value={filters.type ?? "all"}
        onValueChange={(v) =>
          onChange({ ...filters, type: v === "all" ? "" : (v as TransactionType), categoryId: "" })
        }
      >
        <SelectTrigger className="w-32 h-9 text-sm">
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
        <SelectTrigger className="w-36 h-9 text-sm">
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

      <Input
        type="date"
        className="w-36 h-9 text-sm"
        value={filters.dateFrom ?? ""}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        placeholder="From"
      />
      <Input
        type="date"
        className="w-36 h-9 text-sm"
        value={filters.dateTo ?? ""}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        placeholder="To"
      />

      <Input
        className="w-44 h-9 text-sm"
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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
    </div>
  )
}

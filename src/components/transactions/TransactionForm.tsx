"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Transaction, Category, TransactionFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTodayString } from "@/lib/formatters"
import { cn } from "@/lib/utils"

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().refine((v) => parseFloat(v) > 0, "Must be a positive number"),
  categoryId: z.string().min(1, "Please select a category"),
  description: z.string().min(1, "Description is required").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
})

interface Props {
  transaction?: Transaction
  categories: Category[]
  onSubmit: (data: TransactionFormData) => void
  onCancel: () => void
}

export function TransactionForm({ transaction, categories, onSubmit, onCancel }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: transaction?.type ?? "expense",
      amount: transaction?.amount?.toString() ?? "",
      categoryId: transaction?.categoryId ?? "",
      description: transaction?.description ?? "",
      date: transaction?.date ?? getTodayString(),
    },
  })

  const selectedType = watch("type")
  const filteredCategories = categories.filter(
    (c) => c.type === selectedType || c.type === "both"
  )

  useEffect(() => {
    const current = watch("categoryId")
    const stillValid = filteredCategories.some((c) => c.id === current)
    if (!stillValid) setValue("categoryId", "")
  }, [selectedType]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Type</Label>
        <div className="flex rounded-md border border-input overflow-hidden">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setValue("type", t)}
              className={cn(
                "flex-1 py-2 text-sm font-medium capitalize transition-colors",
                selectedType === t
                  ? t === "income"
                    ? "bg-emerald-600 text-white"
                    : "bg-rose-500 text-white"
                  : "bg-background text-muted-foreground hover:bg-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          {...register("amount")}
        />
        {errors.amount && (
          <p className="text-xs text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select
          value={watch("categoryId")}
          onValueChange={(v) => setValue("categoryId", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  {cat.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.categoryId && (
          <p className="text-xs text-destructive">{errors.categoryId.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          placeholder="What was this for?"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register("date")} />
        {errors.date && (
          <p className="text-xs text-destructive">{errors.date.message}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {transaction ? "Save Changes" : "Add Transaction"}
        </Button>
      </div>
    </form>
  )
}

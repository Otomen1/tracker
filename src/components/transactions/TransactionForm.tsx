"use client"

import { useEffect, useMemo, useState, KeyboardEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Transaction, Category, CategoryFormData, TransactionFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CategoryDialog } from "@/components/categories/CategoryDialog"
import { useCategories } from "@/hooks/useCategories"
import { getTodayString } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { X, RefreshCw, Plus } from "lucide-react"

const NEW_CATEGORY_VALUE = "__new_category__"

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.string().refine((v) => parseFloat(v) > 0, "Must be a positive number"),
  categoryId: z.string().min(1, "Please select a category"),
  description: z.string().trim().min(1, "Description is required").max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  notes: z.string().max(500).optional(),
  isRecurring: z.boolean().optional(),
  recurringDay: z.number().min(1).max(31).optional(),
})

interface Props {
  transaction?: Transaction
  categories: Category[]
  onSubmit: (data: TransactionFormData) => void
  onCancel: () => void
}

export function TransactionForm({ transaction, categories, onSubmit, onCancel }: Props) {
  const [tags, setTags] = useState<string[]>(transaction?.tags ?? [])
  const [tagInput, setTagInput] = useState("")
  const [newCategoryOpen, setNewCategoryOpen] = useState(false)
  // Categories created inline this session, in case the parent's own `categories`
  // prop hasn't re-rendered yet — same-tab localStorage writes don't trigger the
  // cross-tab "storage" event useLocalStorage relies on for sync.
  const [createdCategories, setCreatedCategories] = useState<Category[]>([])
  const { addCategory } = useCategories()

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
      notes: transaction?.notes ?? "",
      isRecurring: transaction?.isRecurring ?? false,
      recurringDay: transaction?.recurringDay ?? new Date().getDate(),
    },
  })

  const selectedType = watch("type")
  const isRecurring = watch("isRecurring")

  const allCategories = useMemo(() => {
    const extra = createdCategories.filter((c) => !categories.some((existing) => existing.id === c.id))
    return [...categories, ...extra]
  }, [categories, createdCategories])

  const filteredCategories = allCategories.filter((c) => c.type === selectedType)

  useEffect(() => {
    const current = watch("categoryId")
    const stillValid = filteredCategories.some((c) => c.id === current)
    if (!stillValid) setValue("categoryId", "")
  }, [filteredCategories, watch, setValue])

  const addTag = () => {
    const trimmed = tagInput.trim().toLowerCase().replace(/\s+/g, "-")
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      setTags((prev) => [...prev, trimmed])
      setTagInput("")
    }
  }

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      addTag()
    }
  }

  const handleFormSubmit = (data: TransactionFormData) => {
    onSubmit({ ...data, tags })
  }

  const handleCategoryValueChange = (v: string) => {
    if (v === NEW_CATEGORY_VALUE) {
      setNewCategoryOpen(true)
      return
    }
    setValue("categoryId", v)
  }

  const handleCreateCategory = (data: CategoryFormData) => {
    const created = addCategory(data)
    setCreatedCategories((prev) => [...prev, created])
    setValue("categoryId", created.id)
  }

  return (
    <>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={selectedType === t}
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
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? "amount-error" : undefined}
            {...register("amount")}
          />
          {errors.amount && <p id="amount-error" className="text-xs text-destructive">{errors.amount.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category-trigger">Category</Label>
          <Select value={watch("categoryId")} onValueChange={handleCategoryValueChange}>
            <SelectTrigger
              id="category-trigger"
              aria-invalid={!!errors.categoryId}
              aria-describedby={errors.categoryId ? "category-error" : undefined}
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    {cat.name}
                  </span>
                </SelectItem>
              ))}
              <SelectSeparator />
              <SelectItem value={NEW_CATEGORY_VALUE}>
                <span className="flex items-center gap-2 text-primary font-medium">
                  <Plus className="w-3.5 h-3.5" />
                  New category
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors.categoryId && <p id="category-error" className="text-xs text-destructive">{errors.categoryId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="What was this for?"
            maxLength={200}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "description-error" : undefined}
            {...register("description")}
          />
          {errors.description && <p id="description-error" className="text-xs text-destructive">{errors.description.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" {...register("date")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <textarea
            id="notes"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            placeholder="Additional details..."
            maxLength={500}
            aria-invalid={!!errors.notes}
            aria-describedby={errors.notes ? "notes-error" : undefined}
            {...register("notes")}
          />
          {errors.notes && <p id="notes-error" className="text-xs text-destructive">{errors.notes.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Tags <span className="text-muted-foreground font-normal">(optional, press Enter)</span></Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-xs">
                #{tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  className="p-1 -m-1"
                  onClick={() => setTags((p) => p.filter((t) => t !== tag))}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          {tags.length >= 5
            ? <p className="text-xs text-muted-foreground">Maximum 5 tags reached</p>
            : (
              <Input
                placeholder="Add tag..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={addTag}
              />
            )
          }
        </div>

        <div className="flex items-start gap-3 p-3 rounded-md border border-input bg-muted/30">
          <input
            type="checkbox"
            id="isRecurring"
            className="mt-0.5 h-4 w-4 rounded border-input"
            {...register("isRecurring")}
          />
          <div className="flex-1">
            <label htmlFor="isRecurring" className="flex items-center gap-1.5 text-sm font-medium cursor-pointer">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
              Repeat monthly
            </label>
            {isRecurring && (
              <div className="mt-2">
                <label className="text-xs text-muted-foreground">Day of month</label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  className="mt-1 h-8 w-20 text-sm"
                  {...register("recurringDay", { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground mt-1">In shorter months, the transaction uses the last available day.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button type="submit" className="flex-1">{transaction ? "Save Changes" : "Add Transaction"}</Button>
        </div>
      </form>

      <CategoryDialog
        open={newCategoryOpen}
        onOpenChange={setNewCategoryOpen}
        defaultType={selectedType}
        existingNames={filteredCategories.map((c) => c.name)}
        onSubmit={handleCreateCategory}
      />
    </>
  )
}

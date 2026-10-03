"use client"

import { useEffect } from "react"
import { useDraftGuard } from "@/hooks/useDraftGuard"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Category, CategoryFormData } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { COLOR_PRESETS } from "@/lib/constants"
import { cn } from "@/lib/utils"

const schema = z.object({
  name: z.string().min(1, "Name is required").max(30),
  type: z.enum(["income", "expense"]),
  color: z.string().min(4, "Color is required"),
  budget: z.string().optional(),
})

interface FormFields {
  name: string
  type: "income" | "expense"
  color: string
  budget?: string
}

interface Props {
  category?: Category
  defaultType?: "income" | "expense"
  existingNames?: string[]
  onSubmit: (data: CategoryFormData) => Promise<unknown> | unknown
  onDirtyChange?: (dirty: boolean) => void
  onCancel: () => void
}

export function CategoryForm({ category, defaultType = "expense", existingNames = [], onSubmit, onCancel, onDirtyChange }: Props) {
  const {
    register, handleSubmit, watch, setValue, setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? "",
      type: (category?.type as "income" | "expense") ?? defaultType,
      color: category?.color ?? COLOR_PRESETS[0],
      budget: category?.budget?.toString() ?? "",
    },
  })

  useDraftGuard(isDirty, isSubmitting)
  useEffect(() => { onDirtyChange?.(isDirty) }, [isDirty, onDirtyChange])
  const selectedColor = watch("color")
  const selectedType = watch("type")

  const handleFormSubmit = async (data: FormFields) => {
    const duplicate = existingNames
      .filter((n) => n.toLowerCase() !== category?.name?.toLowerCase())
      .some((n) => n.toLowerCase() === data.name.toLowerCase())
    if (duplicate) {
      setError("name", { type: "manual", message: "A category with this name already exists" })
      return
    }
    await onSubmit({
      name: data.name,
      type: data.type,
      color: data.color,
      budget: data.budget ? parseFloat(data.budget) : undefined,
    })
  }

  return (
    <form aria-busy={isSubmitting} onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <fieldset disabled={isSubmitting} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Category name" maxLength={30} {...register("name")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      {!category && (
        <div className="space-y-1.5">
          <Label>Type</Label>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={selectedType === t}
                onClick={() => setValue("type", t, { shouldDirty: true })}
                className={cn(
                  "min-h-12 flex-1 py-2 text-sm font-medium capitalize transition-colors",
                  selectedType === t
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {(category?.type === "expense" || (!category && selectedType === "expense")) && (
        <div className="space-y-1.5">
          <Label htmlFor="budget">
            Monthly Budget <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="budget"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("budget")}
          />
          <p className="text-xs text-muted-foreground">Leave empty for no budget limit</p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Choose color ${color}`}
              aria-pressed={selectedColor === color}
              onClick={() => setValue("color", color, { shouldDirty: true })}
              className={cn(
                "w-12 h-12 rounded-full transition-transform",
                selectedColor === color ? "scale-125 ring-2 ring-offset-1 ring-zinc-400" : "hover:scale-110"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setValue("color", e.target.value, { shouldDirty: true })}
            className="w-12 h-12 rounded-full cursor-pointer border border-zinc-200 p-0.5"
            title="Custom color"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" disabled={isSubmitting} onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1">{isSubmitting ? "Saving…" : category ? "Save Changes" : "Add Category"}</Button>
      </div>
      </fieldset>
    </form>
  )
}

"use client"

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
})

interface Props {
  category?: Category
  defaultType?: "income" | "expense"
  existingNames?: string[]
  onSubmit: (data: CategoryFormData) => void
  onCancel: () => void
}

export function CategoryForm({
  category,
  defaultType = "expense",
  existingNames = [],
  onSubmit,
  onCancel,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: category?.name ?? "",
      type: (category?.type as "income" | "expense") ?? defaultType,
      color: category?.color ?? COLOR_PRESETS[0],
    },
  })

  const selectedColor = watch("color")
  const selectedType = watch("type")

  const handleFormSubmit = (data: CategoryFormData) => {
    if (
      existingNames
        .filter((n) => n.toLowerCase() !== category?.name.toLowerCase())
        .some((n) => n.toLowerCase() === data.name.toLowerCase())
    ) {
      return
    }
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          placeholder="Category name"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

      {!category && (
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

      <div className="space-y-2">
        <Label>Color</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValue("color", color)}
              className={cn(
                "w-7 h-7 rounded-full transition-transform",
                selectedColor === color ? "scale-125 ring-2 ring-offset-1 ring-zinc-400" : "hover:scale-110"
              )}
              style={{ backgroundColor: color }}
            />
          ))}
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setValue("color", e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border border-zinc-200 p-0.5"
            title="Custom color"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {category ? "Save Changes" : "Add Category"}
        </Button>
      </div>
    </form>
  )
}

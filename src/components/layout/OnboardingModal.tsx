"use client"

import { useEffect, useState } from "react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { TrendingUp, Tags, Settings, ArrowRight } from "lucide-react"
import { STORAGE_KEYS } from "@/lib/constants"

const STEPS = [
  {
    icon: TrendingUp,
    title: "Welcome to Expense Tracker",
    description: "Track your income and expenses privately — everything stays on your device. No accounts, no servers, no subscriptions.",
  },
  {
    icon: Tags,
    title: "Categories & Tags",
    description: "Organize your spending with categories and custom tags. Manage categories and set monthly budgets anytime from Settings.",
  },
  {
    icon: Settings,
    title: "Ready to go",
    description: "Add your first transaction using the + button or the quick-add button at the bottom of the screen. Your data is auto-saved.",
  },
]

interface Props {
  onFinish?: () => void
}

export function OnboardingModal({ onFinish }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEYS.ONBOARDED)) {
      setOpen(true)
    }
  }, [])

  const handleFinish = () => {
    localStorage.setItem(STORAGE_KEYS.ONBOARDED, "1")
    setOpen(false)
  }

  // Only the explicit "Get Started" click opens Quick Add - dismissing via
  // Escape/backdrop click (which also routes through handleFinish via
  // onOpenChange below) still completes onboarding but shouldn't pop open a
  // second modal the user didn't ask for.
  const handleGetStarted = () => {
    handleFinish()
    onFinish?.()
  }

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleFinish() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3 mx-auto">
            <Icon className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
          </div>
          <DialogTitle className="text-center">{current.title}</DialogTitle>
          <DialogDescription className="text-center">{current.description}</DialogDescription>
        </DialogHeader>

        <div role="tablist" aria-label="Onboarding steps" className="flex items-center justify-center gap-1.5 mt-2">
          {STEPS.map((_, i) => (
            <span
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={`Step ${i + 1} of ${STEPS.length}`}
              className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-zinc-900 dark:bg-zinc-100" : "w-1.5 bg-zinc-200 dark:bg-zinc-700"}`}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-4">
          {step > 0 && (
            <Button variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
          )}
          <Button
            className="flex-1 gap-1.5"
            onClick={() => isLast ? handleGetStarted() : setStep((s) => s + 1)}
          >
            {isLast ? "Get Started" : "Next"}
            {!isLast && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

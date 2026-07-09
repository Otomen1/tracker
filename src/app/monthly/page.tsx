import { redirect } from "next/navigation"
import { getMonthlyRedirectTarget } from "@/lib/legacyRedirects"

interface Props {
  searchParams: Promise<{ month?: string }>
}

export default async function MonthlyRedirectPage({ searchParams }: Props) {
  const { month } = await searchParams
  redirect(getMonthlyRedirectTarget(month))
}

import { redirect } from "next/navigation"
import { getAnnualRedirectTarget } from "@/lib/legacyRedirects"

interface Props {
  searchParams: Promise<{ year?: string }>
}

export default async function AnnualRedirectPage({ searchParams }: Props) {
  const { year } = await searchParams
  redirect(getAnnualRedirectTarget(year))
}

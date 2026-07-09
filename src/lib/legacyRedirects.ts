// Target-URL logic for the retired /monthly and /annual routes, extracted as
// pure functions so the validation/fallback behavior is unit-testable without
// needing Next.js route-rendering infrastructure. The redirect() call itself
// lives in the (otherwise trivial) page files.

const MONTH_RE = /^\d{4}-\d{2}$/
const YEAR_RE = /^\d{4}$/

export function getMonthlyRedirectTarget(month?: string): string {
  return month && MONTH_RE.test(month) ? `/analytics?view=month&month=${month}` : "/analytics"
}

export function getAnnualRedirectTarget(year?: string): string {
  return year && YEAR_RE.test(year) ? `/analytics?view=year&year=${year}` : "/analytics"
}

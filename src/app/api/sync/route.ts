import { databaseHealth, synchronize } from "@/lib/db/syncRepository"
import { syncRequestSchema } from "@/lib/sync/contracts"

export const runtime = "nodejs"
// Static generation keeps the Capacitor export buildable. POST remains a
// server operation in the normal Next.js build; the Android client never
// calls this route.
export const dynamic = "force-static"

function hasValidOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.get("host")
  } catch {
    return false
  }
}

export async function GET() {
  if (process.env.CAPACITOR_BUILD === "1") {
    return Response.json({ connected: false, staticBuild: true })
  }
  try {
    return Response.json(await databaseHealth(), { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    return Response.json(
      { connected: false, error: error instanceof Error ? error.message : "PostgreSQL is unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }
}

export async function POST(request: Request) {
  if (!hasValidOrigin(request)) return Response.json({ error: "Cross-origin synchronization is not allowed" }, { status: 403 })
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (contentLength > 2 * 1024 * 1024) return Response.json({ error: "Sync request is too large" }, { status: 413 })
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 })
  }
  const parsed = syncRequestSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: "Invalid sync request", issues: parsed.error.flatten() }, { status: 400 })
  }
  try {
    return Response.json(
      await synchronize(parsed.data.deviceId, parsed.data.cursor, parsed.data.operations),
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Tracker synchronization failed", error instanceof Error ? error.message : error)
    return Response.json({ error: "PostgreSQL synchronization is temporarily unavailable" }, { status: 503 })
  }
}

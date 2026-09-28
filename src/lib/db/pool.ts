import "server-only"
import { Pool } from "pg"

declare global {
  var __trackerPostgresPool: Pool | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL is not configured")
  return new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 3_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 10_000,
    application_name: "tracker-local-sync",
  })
}

export function getPool(): Pool {
  if (!globalThis.__trackerPostgresPool) globalThis.__trackerPostgresPool = createPool()
  return globalThis.__trackerPostgresPool
}

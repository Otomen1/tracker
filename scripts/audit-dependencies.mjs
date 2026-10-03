import { spawnSync } from "node:child_process"

// An upstream build-time parser currently has no patched npm release. Keep
// this exception advisory-specific, visible and expiring; never ignore all
// findings on a package or dependency subtree.
const allowed = "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm"
const expires = Date.parse("2026-11-03T00:00:00Z")
const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--json"], { encoding: "utf8", shell: process.platform === "win32" })
let report
try { report = JSON.parse(result.stdout) } catch { console.error("Dependency audit did not return valid JSON."); process.exit(1) }
if (report.error || !report.vulnerabilities) { console.error("Dependency audit failed."); process.exit(1) }
const vulnerabilities = report.vulnerabilities
const sources = (name, seen = new Set()) => {
  if (seen.has(name)) return []
  const item = vulnerabilities[name]
  if (!item) return [{ url: "unknown" }]
  const next = new Set([...seen, name])
  return item.via.flatMap(v => typeof v === "string" ? sources(v, next) : [v])
}
let blocked = false
for (const [name, item] of Object.entries(vulnerabilities)) {
  if (!["high", "critical"].includes(item.severity)) continue
  const causes = sources(name)
  if (Date.now() < expires && causes.length && causes.every(v => v.url === allowed)) {
    console.warn(`Known unpatched build-time advisory: ${name} via ${allowed}; exception expires 2026-11-03. See docs/dependency-security.md.`)
  } else { console.error(`Blocking ${item.severity} vulnerability: ${name}`); blocked = true }
}
console.log(`Audit totals: ${JSON.stringify(report.metadata?.vulnerabilities ?? {})}. Exceptions are not fixes.`)
process.exit(blocked ? 1 : 0)

# Dependency review — 2026-10-03

Next.js and its ESLint configuration are patched to 16.3.8. DOMPurify is 3.4.16 and serialize-javascript is 7.1.2 through compatible dependency updates. The xcode-only UUID override uses 11.1.1-compatible releases; xcode's actual v4-generation API was checked and Capacitor Android sync remains part of verification.

Raw npm audit is not clean: it reports eight high-severity package-chain entries, all originating from GHSA-vfj7-8cjw-p6xm in braces <=3.0.3. The advisory currently lists no patched braces release. Merely upgrading Tailwind would not remove every inherited copy from PWA/ESLint build dependencies.

Sources:
- https://github.com/advisories/GHSA-vcvr-r3jv-pc5j (Next.js ImageResponse patch; Tracker does not use attacker-controlled ImageResponse)
- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm (unpatched recursive glob parser)

Temporary risk treatment: Tracker does not accept user-supplied glob patterns. These dependencies execute in build/lint/file-watch tooling with repository-controlled patterns, rather than receiving financial inputs from the APK. Do not expose build/pattern APIs or run untrusted glob input in this environment.

`npm run audit:dependencies` still invokes the full npm audit. It follows dependency causes and only permits this exact advisory, visibly, until 2026-11-03. New high/critical issues, additional causes, audit failures and expiration fail CI. This is a documented exception, not a fix or a clean-audit claim. Review upstream releases and remove the exception as soon as a patched compatible dependency path is available. Do not renew its expiration without reassessing exposure.

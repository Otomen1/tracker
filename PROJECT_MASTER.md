# Tracker — AI handoff

Updated 2026-10-03. Read this file first, then the linked docs and actual code. This document describes implementation, not proof that a release passed phone testing.

## Identity and scope

Local personal finance app: Next.js/React/TypeScript web/PWA plus Capacitor Android `com.otomen.tracker`. Release metadata is `release.json`: 1.3.2, Android build 19. No Clerk, PostgreSQL, pgAdmin, server synchronization, telemetry or financial-data API. Android INTERNET permission remains removed. Browser records stay in that browser and are not app-encrypted.

Implementation branch: `feature/verified-local-redesign`. Reviewed remote main baseline: `acfc56d34155408b0143cedd83ac65622fa7914e`. Re-fetch and compare before integrating; use remote main to identify published commits and do not overwrite newer work.

## Architecture and data safety

- `VaultContext` owns validated data, serialized mutation/recovery and publish-after-persist. Never publish a successful save before native persistence succeeds; never reset data after an exception.
- `TransactionsContext`, `AccountsContext`, `CategoriesContext` expose commands; `src/domain/finance.ts` defines amount/reference/account/currency/card rules. `src/lib/analytics.ts` classifies refunds without changing stored entries.
- Logical payload schema is 4; read supported 3/legacy data without changing record IDs. Unknown newer versions fail. Native encrypted container and AAD remain version 3 for existing-key compatibility.
- Android AES-GCM vault key is wrapped by Android Keystore, with device authentication, session lock, secure window and app-private files. Independent pre-v4 encrypted checkpoint survives subsequent writes; previous-write snapshot is separate. Restore requires authentication. Erase removes keys/data/checkpoint and reminders.
- Backups are password-encrypted portable files; old plaintext imports remain explicit. Native share uses temporary private cache and cleans it afterward. CSV/PDF are explicitly unencrypted exports.
- Detailed rules: [architecture](docs/architecture.md), [migrations](docs/schema-migrations.md), [security dependencies](docs/dependency-security.md), [release gates](docs/release-checklist.md).

## Implemented behavior (latest scope)

- Accounts are bank/card/wallet/cash transaction sources. Keep create/edit/archive and stable source IDs. No opening balance entry, bank balance calculation, total assets, credit limit, outstanding debt, statement or due-date controls.
- Home shows recorded spending and selected-month incoming/outgoing amounts and transaction counts by source. Source movements include each endpoint's side of a transfer. Click a source or filter Activity to see its records, including archived history.
- Income/expense/own-transfer editor, transfer editing, transaction details, categories/notes/tags, opt-in recurrence and recorded-activity budgets/net goals. Own transfers and card repayments are excluded from spending. Refund metadata on existing transactions retains its spending classification.
- Old opening/card fields remain only as validated encrypted backup compatibility data. New sources store zero in the schema's legacy required openingBalance field. No data/schema rewrite or ID migration is needed to remove the features. Never strip historical metadata on a source rename or delete transactions during the upgrade.
- Capture supports exact approved Ryt/MAE packages only, including Ryt paid and MAE bill-payment screenshot formats. New custom sources do not automatically enable capture. Manual entries remain available. Fingerprints, review retries, edited amount/direction and explicit second-notification linking are preserved.
- Safe save guards/stable creation IDs, pending dialogs, native lock/recovery, routed settings, Back coordinator and cold/warm notification launch remain. Generic Android daily reminders and browser open-tab reminders remain.
- CSV/PDF native share or browser download includes source/transfer endpoint names, with failure feedback and private cache cleanup. Portable backups remain encrypted and previewable. CSV/PDF are unencrypted records.
- Details of the corrected plan: [transaction-sources-plan](docs/transaction-sources-plan.md). This supersedes earlier plans to track assets or card outstanding balances.

## UI and Android behavior (1.3.2)

Whole-row details and safe actions, shared Home recent activity, visible in/out/transfer filters, simplified settings, original notification details, draft-safe Back/link/refresh guards and 48px controls are implemented. Native IME-first Back and source-only storage remain. Dialog sizing responds to the visual viewport; Android respects system text scaling. See [android-ui-behavior](docs/android-ui-behavior.md) for exact behavior and remaining phone gates. Closing a detail overlay preserves list filters/page/scroll; no draft persistence is added outside the native vault.

## Build and verify

Node >=22.22.2, Java 21, Android SDK 36. `npm ci`; `npm test`; `npm run typecheck`; `npm run lint`; `npm run build`; `npm run test:e2e`; `npm run audit:dependencies`.

APK assets: `npm run android:sync`. Native checks: `cd android && bash ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest`. Execute `:app:connectedDebugAndroidTest` on a disposable emulator. Use app-qualified tasks: building every dependency's own test APK can hit unrelated legacy Kotlin test dependencies.

The audit gate allows only the documented unpatched build-time braces advisory until 2026-11-03; it rejects new high/critical findings and expiry. Raw npm audit is not clean. Do not silently extend or widen the exception.

191 tests passed during implementation. Production and Android builds are recorded in `docs/implementation-status.md`. Browser automation was attempted but Chromium could not launch because this environment denies socket creation; those flows are not passed. Instrumentation tests compile but require an emulator/device to execute.

## Release and unresolved verification

Original signing key and an actual user phone are not available here. A debug APK is not an update to the installed release. Restore private signing files on the owner's build PC, increase release code if necessary, verify signer, back up, install OVER the existing app and reconcile IDs/counts/amounts/source links. Never uninstall/clear storage to overcome signing mismatch.

Follow every device gate in release-checklist: unlock/reopen/migration/recovery, low storage, capture cleanup, Back/keyboard/dirty draft, cold/warm launch, reminders, accessibility, airplane mode and encrypted backup restore. The October 3 notification screenshots were inspected; tests preserve visible wording/amounts while redacting counterparties. The earlier unavailable screenshot was not independently verified. No signed release, deployment or real-data migration was performed in this session.

# Implementation status — 2026-10-03

All six implementation phases of the verified local-only plan have code and documentation on `feature/verified-local-redesign`, based on reviewed main `acfc56d34155408b0143cedd83ac65622fa7914e`. This is not a signed APK release; consult remote main for published code.

Implemented: serialized/pending save safeguards; corrected capture transfer amount/direction and explicit pairing; shared finance validation/classification; v4 payload and independent encrypted recovery checkpoint; custom accounts/cards/manual statements/refunds; one transaction editor and transfer editing; mobile details/navigation/Back coordinator; routed settings; native daily reminders; native CSV/PDF share with error handling; dependency patches/expiring audit gate; Android/emulator CI; release metadata and refreshed handoff docs.

## Executed verification

| Check | Result |
|---|---|
| Vitest unit/component suite | 177 passed across 19 files |
| ESLint / TypeScript | Passed |
| Production web build | Passed on Next.js 16.3.8; all static routes generated |
| Android static web export + Capacitor sync | Passed on Next.js 16.3.8 |
| Native app unit tests | 11 passed, zero failures/errors |
| `:app:assembleDebug` | Passed with final packaged web assets |
| `:app:assembleDebugAndroidTest` | Passed; tests compiled, not executed on a device |
| Dependency gate | Passed with exact documented exception; raw audit still has 8 high chain findings from one unpatched build-time braces advisory |
| Playwright desktop/mobile flows | Blocked before page launch: Chromium socket creation denied by environment (`Operation not permitted`) |
| Signed release / installed-user upgrade | Not executed; original private signing key and phone unavailable |

The test count includes meaningful save retry/duplicate guards, inbox lock/read lifecycle, legacy migration preservation, transfer direction/amount, card arithmetic, and export share cleanup failures. Both production web and Android static-export builds completed successfully.

## Release gates still required

Run Playwright on the owner's PC or CI; execute instrumented migration tests on a disposable emulator. Use the original signing key to build an update, export a verified encrypted backup, install over the existing app, and reconcile records/balances. Follow the complete [release checklist](release-checklist.md) for authentication, interrupted/low-storage migration, recovery, gestures, keyboard, notification launch, reminders, denied permissions, accessibility and airplane mode.

Do not uninstall the existing app, clear storage, weaken vault validation, replace its signing key or mark these device gates passed based on a debug build. Manual statement information is not an automatically reconciled bank statement. New accounts do not add capture support for unapproved bank packages.

## Notification follow-up — 2026-10-03

Inspected three uploaded screenshots. Added MAE's exact Payments/bill-payment format (RM76.20); existing Ryt paid recognition now labels merchant payments correctly. Added redacted screenshot-shaped fixtures for RM9.00, RM2.50, RM5.00 paid and RM20.00 sent, bill-payment whitespace/curly apostrophe, duplicate fingerprint and negative/promotion cases. The allowlist and group-summary filtering are unchanged. Native tests/debug build pass (17 native unit tests). No historical Android notification-history import or real-phone delivery test was performed. New APK installation is required for parser changes.

## Latest scope: transaction sources — release 1.3.1 / Android 18

This scope supersedes the account-asset/card-outstanding features listed in the earlier phase history. Sources and all transaction links remain. Opening balance setup, source balance calculation API, total assets and card debt/statement controls are removed. Home shows recorded in/out activity; own transfers are excluded from spending, but each source displays its movement. Source filters/deep links and source-aware CSV/PDF exports were added. Legacy financial metadata is retained only for encrypted backup compatibility; no destructive migration or transaction deletion.

Latest checks: 183 Vitest tests across 21 files pass, TypeScript and ESLint pass, Android static web export/Capacitor sync pass, 17 native unit tests and debug/instrumentation APK compilation pass. The production web build also passed. Browser flows remain unexecuted because of the previously observed socket restrictions; instrumentation execution, original-key signed upgrade and physical-phone checks remain required.

## Mobile interaction update — release 1.3.2 / Android 19

Transaction rows open details, with Edit/Delete inside the detail dialog; Home uses the same interaction. Activity adds source/direction filtering, and review entries expose the original captured information. Shared controls use 48px minimum touch targets, dialogs fit the visible viewport, feedback sits above navigation, and Android follows system font scaling. Settings labels reflect transaction sources and local security.

Unsaved transaction, source, category and review changes now guard link/native Back navigation; pending saves prevent dismissal. Native Back retains keyboard-first and overlay-first behavior, returns nested settings to Settings, main screens to Home, and exits at Home. Browser history remains browser-managed. Drafts stay in memory and are not written outside the encrypted vault.

Final checks: 191 tests across 23 files and ESLint pass; Android static export/Capacitor sync and 17 native unit tests pass; debug and instrumented-test APKs compile. Production web build passes. Browser automation remains blocked by the previously observed socket restrictions. Instrumentation execution, physical gesture/keyboard/TalkBack checks and original-key signed upgrade remain release gates. See [Android UI behavior](android-ui-behavior.md) for the exact interaction contract.

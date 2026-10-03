# Transaction-source scope — 2026-10-03

The latest user scope supersedes the previous asset/card-balance redesign. Keep accounts as sources for personally recorded incoming/outgoing transactions; remove account balances and total assets. Release 1.3.1 / Android 18.

1. Keep source creation, name/kind, archive, transaction references and own-transfer endpoints. Remove opening balance setup and balance calculation APIs; remove limits, outstanding amounts and statement/due fields from the interface.
2. Replace Home account balances with selected-month recorded incoming/outgoing amounts and counts. Include each endpoint's transfer movement in its source summary; exclude own transfers from spending/income analytics to avoid double counting.
3. Keep Ryt/MAE capture and its account IDs, review, edited amounts, direction, fingerprint deduplication and explicit transfer linking. State unsupported bank capture honestly. Creating a source does not install a parser.
4. Keep all historical transactions, IDs, references, recurring rules, backup import/export and encrypted native storage. No destructive migration. Existing financial metadata remains in schema-v4 backups only for compatibility; it is not used to derive balances. New sources have zero in the legacy required openingBalance field. Retain schema/container versions and the independent checkpoint.
5. Add per-source transaction filtering/deep links and source identifiers to exports. Name analytics and optional goals as recorded activity/net, never net worth or assets. Keep manual entries for cash/unsupported sources and explicit recurring entries chosen by the user.
6. Test source creation without financial setup, metadata/history preservation on editing, per-source transfer movements, month isolation, source filters/exports, web checks and packaged APK builds. Original signing key, phone upgrade and browser/emulator execution remain release gates.

Implemented in the source. Validation results and remaining gates are in implementation-status.md. Do not delete existing records or introduce automatic estimates for dividends, subscriptions or missing bank notifications.

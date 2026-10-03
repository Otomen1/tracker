# Schema v4 and encrypted container compatibility

Logical payload schema is 4; readers accept 3 and 4 only. Omitted historical account kind means bank. Existing IDs, references, opening balances, decimal amounts, categories and settings remain unchanged. Schema 4 adds account kind/card snapshot fields, refund semantics and linked notification identities. New fields are optional so older valid records survive. Unknown newer vault/backup versions fail closed.

The encrypted container remains deliberately at format 3: filename `tracker-vault-v3.enc`, GCM AAD `com.otomen.tracker:vault:3`, existing key envelope/Keystore identity. The 3 in that name is the container format, not the logical payload version. Do not rename the file, change AAD or generate replacement keys to implement a payload upgrade.

On opening a v3 vault, JS validates and represents it as logical v4 in memory without changing records. On the first successful write, native code copies the original encrypted bytes to the independent `tracker-vault-pre-v4.enc` checkpoint before writing logical v4 atomically to the current container. It reopens/decrypts/validates the committed file. Later writes do not rotate away that checkpoint. A failed migration does not create an empty vault or delete the old source.

The previous-write snapshot remains separate and rotates on writes. The pre-upgrade checkpoint is deliberately retained until explicit erase in this release, rather than automatically deleted after a timed unlock. Settings → Security can restore it after fresh authentication and a warning that newer activity leaves the active vault. Restoring preserves the former active ciphertext in the previous snapshot. This is explicit recovery, not cloud sync or a full backup archive.

Legacy browser-to-native migration still validates a copy, retains plaintext during the transition, and cleans sensitive localStorage only after a later successful unlock. Browser storage itself stays unencrypted. Portable backups use logical version 4 and can import older versions 1–3 through validation. Password encryption format remains unchanged. Backup import verifies references/types, previews counts and commits as one replacement; archived history is allowed on restore. It rejects unknown newer formats and mixed currencies.

Downgrade is unsupported. Never force-install an older APK over v4 data. The old native validator will reject logical v4; browser code must also check the schema marker. Recovery means restoring an intentionally selected older snapshot with the new reader, not weakening validation or overwriting an unreadable vault.

Tests: JS migration/round-trip tests; native instrumented migration tests in an isolated cache directory covering legacy ciphertext, checkpoint persistence, unsupported versions, dates and stale revisions. CI runs native unit/debug builds plus emulator instrumentation. This does not prove biometric behavior or the real user's signed-update path; those remain physical-device gates.

## Transaction-source simplification (1.3.1)

The payload stays v4. Source IDs, transaction links, history, capture fingerprints and older financial metadata are retained. No source balance is calculated or displayed. Old opening/card fields are compatibility data only; new sources use zero for required openingBalance and omit card financial fields. Removing these UI features does not require a destructive migration. Backup readers and native validators continue to preserve the old fields.

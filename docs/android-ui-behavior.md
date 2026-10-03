# Android UI behavior — 1.3.2 / build 19

This release keeps transaction sources and recorded in/out activity; it does not restore asset monitoring.

## Screens and taps

Home prioritizes pending reviews, recorded spending and source activity. Recent activity and Activity use the same row/details behavior. Tap a row or its accessible description button to open details; Edit/Delete live in details instead of small row icons. Bulk-selection mode makes row taps select records. Closing details keeps the underlying filters, page and scroll position because the list stays mounted.

Activity has visible All / Money in / Money out / Transfers buttons and a source filter. More Filters retains categories, dates, amounts, tags and recurrence. Settings labels are concise and routed. Mobile Home has an inline Add action; Activity has its one-handed floating Add action. No Add action is shown in unrelated settings/review screens.

The editor starts with amount, type, source, category and description; optional date/notes/tags/recurrence stay under More details. User category changes mark the draft dirty. Transfers between own sources/card repayments are distinguished from expenses paid to others. Review shows original detected amount/text/time separately from editable fields, and explicit own-transfer/link guidance.

## Back and navigation

Android MainActivity hides the IME before dispatching Back to JavaScript. Open overlays get Escape before route navigation. Editors ask before discarding changes and reject dismissal during save. Without overlays, edited review drafts ask once before Back or link navigation; any busy write blocks navigation. Nested settings return to Settings, other top routes return Home, and Home allows native exit. Locked state allows exit while keeping the vault locked. Notification entry uses the same leave guard.

Review refresh also checks drafts before replacing cards; discard and confirmation have immediate repeat-tap guards and disabled committing fields. Browser unload gets its standard unsaved-change warning. Ordinary browser history remains browser-managed; the native policy is not implemented by repeatedly adding artificial browser history entries.

Navigation guards hold only dirty/busy flags in memory. No transaction drafts or search contents are copied into persistent browser storage on Android. Normal modal dismissal preserves list state. After native security lock, financial screens/drafts are cleared as before; authentication is required to see records again.

## Touch, keyboard and accessibility

Shared buttons, inputs and select triggers have a 48 CSS-pixel minimum height; icon buttons and dialog close targets have 48-pixel minimum width/height. Mobile native selects use the same minimum. Larger system text is applied to Android WebView text zoom. Buttons wrap where needed, long dialog titles wrap, and status/type/source labels do not rely solely on color. Keyboard focus remains visible; viewport resize updates dialog height and scrolls focused fields into view. Reduced-motion styles remain supported.

## Verification and limits

Component tests cover native Back parents, overlay priority, Home/locked exit, dirty/busy navigation, single confirmation for multiple drafts, whole-row details and bulk selection. Existing save/capture/migration tests remain.

Physical checks are still required for gesture/three-button navigation, predictive gesture animation, IME behavior on the user's keyboard, large font scaling, TalkBack, notification cold/warm launch, background/resume and signed updates. Browser automation was previously blocked by this environment's socket restrictions. Do not mark those checks passed based on a component test or debug build. No signed APK release or deployment is performed by this code change.

# Tracker

A privacy-first personal expense tracker built with Next.js. Browser storage remains the primary offline store. The local web server can optionally synchronize it with a local PostgreSQL database.

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Optional local PostgreSQL synchronization

The regular Next.js web build exposes `/api/sync`. The browser always saves locally first, queues changes while PostgreSQL is unavailable, and retries later. Database credentials remain on the server.

1. Copy `.env.example` to `.env.local`.
2. Replace `REPLACE_WITH_YOUR_PASSWORD` with the password for `tracker_user`.
3. Confirm PostgreSQL is running and the existing `accounts`, `categories`, `transactions`, and `settings` tables are in the `public` schema.
4. Run `npm run dev` and open `http://localhost:3000`.
5. Check **Settings → Data & backup → PostgreSQL sync**.

On the first successful sync, Tracker creates `tracker_sync_records`, `tracker_sync_operations`, and `tracker_sync_version_seq`. These contain sync versions, operation IDs, and deletion tombstones. Existing application tables are not dropped or recreated.

Check database connectivity and table compatibility:

```bash
curl http://localhost:3000/api/sync
```

The Capacitor build stays local-only because a static Android bundle has no Next.js server. It does not attempt to connect to PostgreSQL.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Data and backups

The app stores its working data in browser local storage. PostgreSQL synchronization does not replace backups. Export backups regularly from **Settings → Data & Backup**. Backups contain financial information, so password protection is recommended. Automatic-backup passwords are kept only for the current browser tab and are never included in exports.

## Technology

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Radix UI, Recharts, Zod, Vitest, and PWA support.

## Private Android build

The Capacitor Android target adds local-only notification capture for Ryt Bank and MAE. It stores normalized pending items in an Android Keystore-encrypted queue, requires review before saving, and never uploads notification or financial data.

```bash
npm run android:sync
cd android
./gradlew testDebugUnitTest assembleRelease
```

Release signing reads `android/keystore.properties`; signing files and private APK outputs are excluded from Git. Notification access is granted explicitly during first-run setup. Google Wallet capture remains disabled until a real notification format is tested.

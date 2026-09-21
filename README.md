# Tracker

A privacy-first personal expense tracker built with Next.js. Transactions, categories, budgets, and settings stay in the browser; no account or server database is required.

## Run locally

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

## Data and backups

The app stores data in browser local storage. Export backups regularly from **Settings → Data & Backup**. Backups contain financial information, so password protection is recommended. Automatic-backup passwords are kept only for the current browser tab and are never included in exports.

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

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

Next.js 15 App Router, React 18, TypeScript, Tailwind CSS, Radix UI, Recharts, Zod, Vitest, and PWA support.

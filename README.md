# Tracker

Tracker is a local-first personal finance app built with Next.js and Capacitor. It has no account system, cloud synchronization, analytics, or financial-data API. The web/PWA build stores records in that browser; the Android APK stores confirmed financial records in an encrypted native vault.

## Run locally

```bash
npm ci
npm run dev
```

Open <http://localhost:3000>.

No `.env` secrets, PostgreSQL server, pgAdmin installation, Clerk account, or Neon database is required.

## Local security model

- The Android vault uses AES-256-GCM with a random data-encryption key.
- Android Keystore protects the key-wrapping key and requires the device PIN or a strong biometric.
- The unwrapped data key exists only during an unlocked app session and is cleared when the app locks.
- Tracker locks after 30 seconds in the background and supports **Settings → Local security → Lock now**.
- Screenshots and screen recording are blocked by `FLAG_SECURE` in the APK.
- Android backup, cleartext traffic, WebView debugging in release builds, broad file sharing, and the Internet permission are disabled.
- Notification capture is opt-in, restricted to approved package IDs, processed locally, and placed in a separate encrypted review inbox.
- Portable backups require a password of at least 12 characters and use PBKDF2-SHA256 (250,000 iterations) plus AES-256-GCM.

The browser/PWA build remains local-only but browser storage is not encrypted by Tracker. Protect the computer account with a strong login and full-disk encryption. Use the Android APK when app-level vault encryption is required.

## Safe upgrade from 1.1.x

Version 1.2.0 keeps the package ID `com.otomen.tracker`, so Android can update the existing installation only when the APK is signed with the original signing key.

On the first successful unlock after updating, Tracker copies and validates the existing browser-stored records into the encrypted vault. The original copy is retained until the encrypted vault survives another successful unlock; only then is sensitive legacy storage removed. Do not uninstall the old app or clear its storage before installing the correctly signed update.

Before updating, create and verify a backup from **Settings → Data & backup**. Backups created by 1.2.0 are password-encrypted. Older plaintext JSON backups can still be imported, with a warning.

## Quality checks

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run android:sync
cd android
./gradlew testDebugUnitTest assembleDebug
```

## Release signing

Release artifacts deliberately fail when `android/keystore.properties` is missing. Restore that file and the original keystore on the build computer before running:

```bash
cd android
./gradlew assembleRelease
```

Signing files and private APK outputs are excluded from Git. Never generate a new key for an update to the installed app: Android will treat it as a different signer and refuse the update.

## Technology

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, Radix UI, Recharts, Zod, Vitest, PWA support, Capacitor 8, Android Keystore, and AndroidX Biometric.

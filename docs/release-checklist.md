# Release checklist

1. Fetch main, inspect the diff and confirm `release.json` version/code exceed the installed app. Android Gradle and About read this file; package version maps to it.
2. Run `npm ci`, `npm run audit:dependencies`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` and `npm run test:e2e`. Raw `npm audit` remains visible; follow the documented advisory exception.
3. Run `npm run android:sync`, then with Java 21 and Android SDK 36: `cd android && bash ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest`. Run `:app:connectedDebugAndroidTest` on a disposable emulator/test install. Tests never target the user's actual vault.
4. Restore private `android/keystore.properties` and the original signing key locally. Build `assembleRelease`; release fails without signing configuration. Compare APK signer certificate to the installed/original APK. Do not sign an update with a debug/new key.
5. Export an encrypted portable backup from the existing app. Record record counts, source-linked records and pending review items. Install the signed release OVER the existing installation; never uninstall/clear storage as an update workaround.
6. Unlock, reopen, reconcile IDs/counts/amounts/source links, create/edit/delete a small test transaction, review incoming/outgoing notifications and edited amounts, simulate cleanup retry, and verify recorded source in/out totals, transfers excluded from spending and retained refund classification. Test wrong backup password and restore on a separate test install first.
7. Test keyboard Back, overlay Back, dirty draft prompt, nested settings, notification cold/warm launch, Home exit, app lock, background/resume, denied notification permission and reminder delivery. Test gestures/three-button navigation, font scaling, TalkBack and airplane mode. Native reminders are inexact and can be delayed by Android battery policy.
8. Check merged release manifest: INTERNET absent, backup disabled, private file sharing retained. Inspect packaged assets/version. Only after these gates distribute/merge a release.

No physical phone or original private signing key was available in this implementation session. The signed update and authentication/gesture checks must not be marked passed from a successful debug build.

package com.otomen.tracker

data class TrustedNotificationSource(
    val provider: String,
    val label: String,
    val packageName: String,
    val accountId: String,
    val captureEnabled: Boolean,
)

object TrustedNotificationSources {
    val ryt = TrustedNotificationSource(
        provider = "ryt",
        label = "Ryt Bank",
        packageName = "my.rytbank.app",
        accountId = "account_ryt",
        captureEnabled = true,
    )
    val mae = TrustedNotificationSource(
        provider = "mae",
        label = "MAE",
        packageName = "com.maybank2u.life",
        accountId = "account_maybank",
        captureEnabled = true,
    )
    val googleWallet = TrustedNotificationSource(
        provider = "google_wallet",
        label = "Google Wallet",
        packageName = "com.google.android.apps.walletnfcrel",
        accountId = "",
        captureEnabled = false,
    )

    private val sources = listOf(ryt, mae, googleWallet)

    /** Only Ryt and MAE are eligible for capture. Google Wallet is reserved until a parser is approved. */
    fun captureSourceFor(packageName: String): TrustedNotificationSource? =
        sources.firstOrNull { it.captureEnabled && it.packageName == packageName }
}

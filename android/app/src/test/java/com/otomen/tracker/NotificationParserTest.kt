package com.otomen.tracker

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class NotificationParserTest {
    private val time = 1790000000000L

    @Test fun parsesRytIncoming() {
        val result = NotificationParser.parse(TrustedNotificationSources.ryt, "Your money is in!", "You've received RM0.01 from TEST USER on 21/9/2026, 8:31 PM (GMT+8).", time)
        assertEquals("income", result?.direction)
        assertEquals(0.01, result?.amount ?: 0.0, 0.0)
        assertEquals("account_ryt", result?.accountId)
    }

    @Test fun parsesRytOutgoing() {
        val result = NotificationParser.parse(TrustedNotificationSources.ryt, "Nice! Transfer settled!", "You've sent RM0.01 to TEST USER on 21/9/2026, 8:28 PM (GMT+8) using your Main Account.", time)
        assertEquals("expense", result?.direction)
    }

    @Test fun parsesMaeTransfer() {
        val result = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Transfer", "You've transferred RM 0.01 to TEST USER", time)
        assertEquals("expense", result?.direction)
        assertEquals("account_maybank", result?.accountId)
    }

    @Test fun parsesMaeScanAndPay() {
        val result = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Scan & Pay", "Successful payment of RM 0.01 to TEST SHOP. REF: QR123", time)
        assertEquals("Scan & Pay to TEST SHOP", result?.description)
    }

    @Test fun rejectsUnknownAndMalformedNotifications() {
        assertNull(NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Transfer", "Transfer completed", time))
        assertNull(NotificationParser.parse(TrustedNotificationSources.mae, "Promotion", "Get RM10 cashback", time))
    }

    @Test fun createsStableFingerprintForRepeatedNotification() {
        val first = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Transfer", "You've transferred RM 1.00 to TEST USER", time)
        val repeated = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Transfer", "You've transferred RM 1.00 to TEST USER", time + 1000)
        assertEquals(first?.fingerprint, repeated?.fingerprint)
    }

    @Test fun acceptsOnlyExactTrustedPackages() {
        assertEquals("ryt", TrustedNotificationSources.captureSourceFor("my.rytbank.app")?.provider)
        assertEquals("mae", TrustedNotificationSources.captureSourceFor("com.maybank2u.life")?.provider)
        assertNull(TrustedNotificationSources.captureSourceFor("my.rytbank.app.fake"))
        assertNull(TrustedNotificationSources.captureSourceFor("com.fake.maybank.alerts"))
        assertNull(TrustedNotificationSources.captureSourceFor("com.google.android.apps.walletnfcrel"))
    }
}

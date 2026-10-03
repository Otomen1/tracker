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

    @Test fun parsesRytPaidMerchant() {
        val result = NotificationParser.parse(TrustedNotificationSources.ryt, "Payment complete", "You've paid RM9.00 to TEST MERCHANT on 30/9/2026, 8:30 PM", time)
        assertEquals("expense", result?.direction)
        assertEquals(9.0, result?.amount ?: 0.0, 0.0)
        assertEquals("account_ryt", result?.accountId)
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

    @Test fun parsesMaeBillPaymentScreenshotFormat() {
        val result = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Payments", "You've performed a Bill Payment of RM 76.20 to TEST CINEMA'S. REF: TEST123", time)
        assertEquals("expense", result?.direction)
        assertEquals(76.20, result?.amount ?: 0.0, 0.0)
        assertEquals("Bill payment to TEST CINEMA'S", result?.description)
        assertEquals("account_maybank", result?.accountId)
    }

    @Test fun parsesMaeBillPaymentWhitespaceAndCurlyApostrophe() {
        val result = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Payments", "You’ve performed a Bill Payment of RM\n76.20 to TEST CINEMA'S. REF: TEST123", time)
        assertEquals(76.20, result?.amount ?: 0.0, 0.0)
    }

    @Test fun rejectsUnverifiedMaePaymentsFormats() {
        assertNull(NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Payments", "Bill Payment of RM 76.20 failed", time))
        assertNull(NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Payments", "Get RM76.20 cashback on a Bill Payment", time))
        assertNull(NotificationParser.parse(TrustedNotificationSources.mae, "Promotion", "You've performed a Bill Payment of RM 76.20 to TEST SHOP", time))
        assertNull(NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Payments", "You've performed a Bill Payment of RM 0.00 to TEST SHOP", time))
    }

    @Test fun parsesRytPaymentScreenshotFormats() {
        for (amount in listOf("9.00", "2.50", "5.00")) {
            val result = NotificationParser.parse(TrustedNotificationSources.ryt, "Nice! Payment successful!", "You've paid RM$amount to TEST MERCHANT on 1/10/2026, 1:07 PM (GMT+8) using your Main Account.", time)
            assertEquals("expense", result?.direction)
            assertEquals(amount.toDouble(), result?.amount ?: 0.0, 0.0)
            assertEquals("Payment to TEST MERCHANT", result?.description)
            assertEquals(java.time.Instant.parse("2026-10-01T05:07:00Z"), java.time.Instant.parse(result?.occurredAt))
        }
    }

    @Test fun parsesRytTransferScreenshotFormat() {
        val result = NotificationParser.parse(TrustedNotificationSources.ryt, "Nice! Transfer settled!", "You've sent RM20.00 to TEST USER on 1/10/2026, 1:03 PM (GMT+8) using your Main Account.", time)
        assertEquals(20.0, result?.amount ?: 0.0, 0.0)
        assertEquals("Transfer to TEST USER", result?.description)
    }

    @Test fun billPaymentDuplicateFingerprintStaysStable() {
        val body = "You've performed a Bill Payment of RM 76.20 to TEST CINEMA'S. REF: TEST123"
        val first = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Payments", body, time)
        val repeat = NotificationParser.parse(TrustedNotificationSources.mae, "Maybank2u: Payments", body, time + 1000)
        assertEquals(first?.fingerprint, repeat?.fingerprint)
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

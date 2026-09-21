package com.otomen.tracker

import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

data class ParsedTransaction(
    val id: String = UUID.randomUUID().toString(),
    val provider: String,
    val fingerprint: String,
    val direction: String,
    val amount: Double,
    val description: String,
    val occurredAt: String,
    val capturedAt: String,
    val accountId: String,
) {
    fun toJson() = JSONObject()
        .put("id", id)
        .put("provider", provider)
        .put("fingerprint", fingerprint)
        .put("direction", direction)
        .put("amount", amount)
        .put("description", description)
        .put("occurredAt", occurredAt)
        .put("capturedAt", capturedAt)
        .put("accountId", accountId)
}

object NotificationParser {
    private val amountPattern = Regex("RM\\s?([0-9,]+(?:\\.[0-9]{1,2})?)", RegexOption.IGNORE_CASE)
    private val rytReceived = Regex("you(?:'|’)ve received\\s+RM", RegexOption.IGNORE_CASE)
    private val rytSent = Regex("you(?:'|’)ve sent\\s+RM", RegexOption.IGNORE_CASE)
    private val maeTransferred = Regex("you(?:'|’)ve transferred\\s+RM", RegexOption.IGNORE_CASE)
    private val maePaid = Regex("successful payment of\\s+RM", RegexOption.IGNORE_CASE)
    private val recipientPattern = Regex("(?:from|to)\\s+(.+?)(?:\\s+on\\s+\\d|\\.\\s*REF:|$)", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))

    fun parse(appLabel: String, packageName: String, title: String, text: String, postedAt: Long): ParsedTransaction? {
        val normalized = text.replace("\n", " ").replace(Regex("\\s+"), " ").trim()
        val provider = when {
            appLabel.contains("Ryt", true) || packageName.contains("ryt", true) -> "ryt"
            appLabel.equals("MAE", true) || packageName.contains("maybank", true) -> "mae"
            else -> return null
        }
        val direction = when (provider) {
            "ryt" -> when {
                rytReceived.containsMatchIn(normalized) -> "income"
                rytSent.containsMatchIn(normalized) -> "expense"
                else -> return null
            }
            "mae" -> when {
                title.contains("Transfer", true) && maeTransferred.containsMatchIn(normalized) -> "expense"
                title.contains("Scan & Pay", true) && maePaid.containsMatchIn(normalized) -> "expense"
                else -> return null
            }
            else -> return null
        }
        val amount = amountPattern.find(normalized)?.groupValues?.get(1)?.replace(",", "")?.toDoubleOrNull() ?: return null
        if (amount <= 0.0 || !amount.isFinite()) return null
        val counterparty = recipientPattern.find(normalized)?.groupValues?.get(1)?.trim()?.take(120)
        val description = counterparty?.let { if (direction == "income") "Transfer from $it" else if (title.contains("Scan & Pay", true)) "Scan & Pay to $it" else "Transfer to $it" }
            ?: title.take(120).ifBlank { if (provider == "ryt") "Ryt transaction" else "MAE transaction" }
        val capturedAt = iso(postedAt)
        val fingerprintInput = listOf(provider, direction, "%.2f".format(Locale.US, amount), normalized.lowercase(Locale.ROOT), (postedAt / 60000).toString()).joinToString("|")
        return ParsedTransaction(
            provider = provider,
            fingerprint = sha256(fingerprintInput),
            direction = direction,
            amount = amount,
            description = description,
            occurredAt = parseRytDate(normalized) ?: capturedAt,
            capturedAt = capturedAt,
            accountId = if (provider == "ryt") "account_ryt" else "account_maybank",
        )
    }

    private fun parseRytDate(text: String): String? {
        val match = Regex("on\\s+(\\d{1,2}/\\d{1,2}/\\d{4},\\s*\\d{1,2}:\\d{2}\\s*[AP]M)", RegexOption.IGNORE_CASE).find(text) ?: return null
        return try {
            val parser = SimpleDateFormat("d/M/yyyy, h:mm a", Locale.US).apply { timeZone = TimeZone.getTimeZone("Asia/Kuala_Lumpur") }
            iso(parser.parse(match.groupValues[1])?.time ?: return null)
        } catch (_: Exception) { null }
    }

    private fun iso(timestamp: Long): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", Locale.US).format(Date(timestamp))
    private fun sha256(value: String): String = MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }
}

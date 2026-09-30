package com.otomen.tracker

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec

class EncryptedVaultStore(private val context: Context) {
    private val file = File(context.filesDir, "tracker-vault-v3.enc")
    private val atomicBackupFile = File(file.path + ".bak")
    private val previousFile = File(context.filesDir, "tracker-vault-v3.previous.enc")
    private val previousBackupFile = File(previousFile.path + ".bak")
    private val atomicFile = AtomicFile(file)
    private val previousAtomicFile = AtomicFile(previousFile)
    private val associatedData = "com.otomen.tracker:vault:3".toByteArray()

    fun exists(): Boolean = synchronized(FILE_LOCK) { file.exists() || atomicBackupFile.exists() }
    fun hasRecovery(): Boolean = synchronized(FILE_LOCK) { previousFile.exists() || previousBackupFile.exists() }

    fun read(): JSONObject = synchronized(FILE_LOCK) {
        if (!exists()) throw IllegalStateException("The encrypted vault has not been created")
        parseAndValidate(decrypt(atomicFile.openRead().use { it.readBytes() }))
    }

    fun initialize(candidate: JSONObject): JSONObject = synchronized(FILE_LOCK) {
        if (exists()) return@synchronized read()
        writeInternal(candidate, 0)
    }

    fun write(candidate: JSONObject, expectedRevision: Long): JSONObject = synchronized(FILE_LOCK) {
        val current = read()
        val currentRevision = current.optLong("revision", -1)
        if (currentRevision != expectedRevision) throw IllegalStateException("Vault changed; reload and try again")
        if (exists()) {
            // read() above lets AtomicFile restore an interrupted prior write.
            writeAtomically(previousAtomicFile, atomicFile.openRead().use { it.readBytes() })
        }
        writeInternal(candidate, currentRevision + 1)
    }

    fun restorePrevious(): JSONObject = synchronized(FILE_LOCK) {
        if (!hasRecovery()) throw IllegalStateException("No recovery snapshot is available")
        val restored = parseAndValidate(decrypt(previousAtomicFile.openRead().use { it.readBytes() }))
        writeEncrypted(encrypt(restored.toString().toByteArray()))
        previousFile.delete()
        previousBackupFile.delete()
        restored
    }

    fun erase() = synchronized(FILE_LOCK) {
        file.delete()
        atomicBackupFile.delete()
        previousFile.delete()
        previousBackupFile.delete()
        Unit
    }

    private fun writeInternal(candidate: JSONObject, revision: Long): JSONObject {
        val next = JSONObject(candidate.toString())
        next.put("schemaVersion", 3)
        next.put("revision", revision)
        next.put("updatedAt", isoTimestamp())
        val validated = parseAndValidate(next.toString().toByteArray())
        writeEncrypted(encrypt(validated.toString().toByteArray()))
        return validated
    }

    private fun parseAndValidate(plaintext: ByteArray): JSONObject {
        require(plaintext.size <= 12 * 1024 * 1024) { "Vault exceeds the 12 MB safety limit" }
        val vault = JSONObject(String(plaintext, Charsets.UTF_8))
        require(vault.optInt("schemaVersion") == 3) { "Unsupported vault version" }
        require(vault.optLong("revision", -1) >= 0) { "Invalid vault revision" }
        requiredString(vault, "updatedAt", 64)

        val transactions = vault.getJSONArray("transactions")
        val categories = vault.getJSONArray("categories")
        val accounts = vault.getJSONArray("accounts")
        require(transactions.length() <= 50_000) { "Too many transactions" }
        require(categories.length() <= 500) { "Too many categories" }
        require(accounts.length() <= 50) { "Too many accounts" }
        validateTransactions(transactions)
        validateCategories(categories)
        validateAccounts(accounts)
        validateSettings(vault.getJSONObject("settings"))
        vault.getBoolean("androidSetupComplete")
        return vault
    }

    private fun validateTransactions(items: JSONArray) {
        requireUniqueIds(items, "transaction")
        for (index in 0 until items.length()) {
            val item = items.getJSONObject(index)
            val type = requiredString(item, "type", 16)
            require(type == "income" || type == "expense" || type == "transfer") { "Invalid transaction type" }
            val amount = item.getDouble("amount")
            require(amount.isFinite() && amount > 0) { "Invalid transaction amount" }
            requiredString(item, "categoryId", 200, allowEmpty = true)
            requiredString(item, "description", 200)
            require(DATE_PATTERN.matches(requiredString(item, "date", 10))) { "Invalid transaction date" }
            requiredString(item, "createdAt", 64)
            requiredString(item, "updatedAt", 64)
            if (type == "transfer") {
                val from = requiredString(item, "fromAccountId", 200)
                val to = requiredString(item, "toAccountId", 200)
                require(from != to) { "Invalid transfer accounts" }
            }
        }
    }

    private fun validateCategories(items: JSONArray) {
        requireUniqueIds(items, "category")
        for (index in 0 until items.length()) {
            val item = items.getJSONObject(index)
            requiredString(item, "name", 30)
            val type = requiredString(item, "type", 16)
            require(type == "income" || type == "expense") { "Invalid category type" }
            require(COLOR_PATTERN.matches(requiredString(item, "color", 7))) { "Invalid category color" }
            item.getBoolean("isDefault")
            requiredString(item, "createdAt", 64)
            if (item.has("budget") && !item.isNull("budget")) {
                val budget = item.getDouble("budget")
                require(budget.isFinite() && budget >= 0) { "Invalid category budget" }
            }
        }
    }

    private fun validateAccounts(items: JSONArray) {
        requireUniqueIds(items, "account")
        for (index in 0 until items.length()) {
            val item = items.getJSONObject(index)
            requiredString(item, "name", 60)
            require(requiredString(item, "currency", 3).length == 3) { "Invalid account currency" }
            require(item.getDouble("openingBalance").isFinite()) { "Invalid opening balance" }
            item.getBoolean("isActive")
            requiredString(item, "createdAt", 64)
            requiredString(item, "updatedAt", 64)
        }
    }

    private fun validateSettings(settings: JSONObject) {
        require(requiredString(settings, "currency", 3).length == 3) { "Invalid settings currency" }
        val theme = requiredString(settings, "theme", 16)
        require(theme == "light" || theme == "dark" || theme == "system") { "Invalid theme" }
        val goal = settings.getDouble("monthlySavingsGoal")
        require(goal.isFinite() && goal >= 0) { "Invalid savings goal" }
    }

    private fun requireUniqueIds(items: JSONArray, label: String) {
        val ids = mutableSetOf<String>()
        for (index in 0 until items.length()) {
            val id = requiredString(items.getJSONObject(index), "id", 200)
            require(ids.add(id)) { "Duplicate $label ID" }
        }
    }

    private fun requiredString(value: JSONObject, key: String, maxLength: Int, allowEmpty: Boolean = false): String {
        require(value.has(key) && !value.isNull(key)) { "$key is missing" }
        val result = value.getString(key)
        require(result.length <= maxLength && (allowEmpty || result.trim().isNotEmpty())) { "Invalid $key" }
        return result
    }

    private fun encrypt(plaintext: ByteArray): ByteArray = VaultSession.withKey { key ->
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key)
        cipher.updateAAD(associatedData)
        cipher.iv + cipher.doFinal(plaintext)
    }

    private fun decrypt(encrypted: ByteArray): ByteArray = VaultSession.withKey { key ->
        require(encrypted.size > 28) { "The encrypted vault is damaged" }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(128, encrypted.copyOfRange(0, 12)))
        cipher.updateAAD(associatedData)
        cipher.doFinal(encrypted.copyOfRange(12, encrypted.size))
    }

    private fun writeEncrypted(bytes: ByteArray) {
        writeAtomically(atomicFile, bytes)
    }

    private fun writeAtomically(target: AtomicFile, bytes: ByteArray) {
        val output = target.startWrite()
        try {
            output.write(bytes)
            output.fd.sync()
            target.finishWrite(output)
        } catch (error: Exception) {
            target.failWrite(output)
            throw error
        }
    }

    private fun isoTimestamp(): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }.format(Date())

    companion object {
        private val FILE_LOCK = Any()
        private val DATE_PATTERN = Regex("^\\d{4}-\\d{2}-\\d{2}$")
        private val COLOR_PATTERN = Regex("^#[0-9A-Fa-f]{3,6}$")
    }
}

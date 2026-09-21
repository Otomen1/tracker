package com.otomen.tracker

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class PendingListResult(val items: List<JSONObject>, val error: String?)

class SecurePendingStore(private val context: Context) {
    private val file = File(context.filesDir, "pending-transactions.enc")
    private val errorFile = File(context.filesDir, "pending-transactions.error")
    private val alias = "tracker-pending-v1"

    @Synchronized fun list(): PendingListResult {
        val array = readArray() ?: return PendingListResult(emptyList(), readError())
        return PendingListResult((0 until array.length()).map { array.getJSONObject(it) }, readError())
    }
    @Synchronized fun add(item: ParsedTransaction): Boolean {
        val array = readArray() ?: return false
        if ((0 until array.length()).any { array.getJSONObject(it).optString("fingerprint") == item.fingerprint }) return false
        array.put(item.toJson()); return writeArray(array)
    }
    @Synchronized fun remove(id: String): Boolean {
        val current = readArray() ?: return false; val next = JSONArray()
        for (index in 0 until current.length()) if (current.getJSONObject(index).optString("id") != id) next.put(current.getJSONObject(index))
        return writeArray(next)
    }
    @Synchronized fun dismissError() { errorFile.delete() }
    private fun readArray(): JSONArray? {
        if (!file.exists()) return JSONArray()
        return try { JSONArray(decrypt(file.readText())) } catch (_: Exception) {
            val retained = File(context.filesDir, "pending-transactions.corrupt-${System.currentTimeMillis()}.enc")
            file.renameTo(retained)
            try { errorFile.writeText("Tracker could not read older review items. They were preserved safely and were not deleted.") } catch (_: Exception) {}
            null
        }
    }
    /** Fsync a temporary file, then atomically replace the live encrypted inbox. */
    private fun writeArray(array: JSONArray): Boolean = try {
        val temp = File(context.filesDir, "pending-transactions.enc.tmp")
        FileOutputStream(temp).use { out -> out.write(encrypt(array.toString()).toByteArray()); out.fd.sync() }
        Files.move(temp.toPath(), file.toPath(), StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); true
    } catch (_: Exception) { false }
    private fun readError(): String? = try { errorFile.takeIf { it.exists() }?.readText() } catch (_: Exception) { "Tracker could not read the secure review inbox." }
    private fun key(): SecretKey { val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }; (store.getKey(alias, null) as? SecretKey)?.let { return it }; return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run { init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build()); generateKey() } }
    private fun encrypt(value: String): String { val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key()); return Base64.encodeToString(cipher.iv + cipher.doFinal(value.toByteArray()), Base64.NO_WRAP) }
    private fun decrypt(value: String): String { val bytes = Base64.decode(value, Base64.NO_WRAP); require(bytes.size > 12); val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12))); return String(cipher.doFinal(bytes.copyOfRange(12, bytes.size))) }
}

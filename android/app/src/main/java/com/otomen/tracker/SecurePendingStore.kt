package com.otomen.tracker

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecurePendingStore(private val context: Context) {
    private val file = File(context.filesDir, "pending-transactions.enc")
    private val alias = "tracker-pending-v1"

    @Synchronized fun list(): List<JSONObject> = readArray().let { array -> (0 until array.length()).map { array.getJSONObject(it) } }

    @Synchronized fun add(item: ParsedTransaction): Boolean {
        val array = readArray()
        if ((0 until array.length()).any { array.getJSONObject(it).optString("fingerprint") == item.fingerprint }) return false
        array.put(item.toJson())
        writeArray(array)
        return true
    }

    @Synchronized fun remove(id: String) {
        val current = readArray()
        val next = JSONArray()
        for (index in 0 until current.length()) if (current.getJSONObject(index).optString("id") != id) next.put(current.getJSONObject(index))
        writeArray(next)
    }

    private fun readArray(): JSONArray {
        if (!file.exists()) return JSONArray()
        return try { JSONArray(decrypt(file.readText())) } catch (_: Exception) { JSONArray() }
    }

    private fun writeArray(array: JSONArray) { file.writeText(encrypt(array.toString())) }

    private fun key(): SecretKey {
        val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (keyStore.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build())
            generateKey()
        }
    }

    private fun encrypt(value: String): String {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        return Base64.encodeToString(cipher.iv + cipher.doFinal(value.toByteArray()), Base64.NO_WRAP)
    }

    private fun decrypt(value: String): String {
        val bytes = Base64.decode(value, Base64.NO_WRAP)
        val iv = bytes.copyOfRange(0, 12)
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)))
    }
}

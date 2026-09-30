package com.otomen.tracker

import android.content.Context
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class VaultKeyManager(private val context: Context) {
    private val alias = "tracker-vault-wrap-v1"
    private val envelopeFile = File(context.filesDir, "tracker-vault-key.enc")
    private val envelopeBackupFile = File(envelopeFile.path + ".bak")
    private val atomicEnvelope = AtomicFile(envelopeFile)

    fun prepare() = synchronized(KEY_LOCK) {
        wrappingKey()
        Unit
    }

    fun unlockOrCreate() = synchronized(KEY_LOCK) {
        if (VaultSession.isUnlocked()) return@synchronized
        val wrappingKey = wrappingKey()
        val dataKey = if (envelopeFile.exists() || envelopeBackupFile.exists()) decryptEnvelope(atomicEnvelope.openRead().use { it.readBytes() }, wrappingKey) else {
            ByteArray(32).also(SecureRandom()::nextBytes).also { writeEnvelope(encryptEnvelope(it, wrappingKey)) }
        }
        try {
            require(dataKey.size == 32) { "The secure vault key is invalid" }
            VaultSession.unlock(dataKey)
        } finally {
            dataKey.fill(0)
        }
    }

    fun erase() = synchronized(KEY_LOCK) {
        VaultSession.lock()
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        store.deleteEntry(alias)
        check(!store.containsAlias(alias)) { "The Android Keystore key could not be erased" }
        envelopeFile.delete()
        envelopeBackupFile.delete()
        Unit
    }

    private fun wrappingKey(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }

        val builder = KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(256)
            .setUserAuthenticationRequired(true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setUserAuthenticationParameters(
                60,
                KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL,
            )
        } else {
            @Suppress("DEPRECATION")
            builder.setUserAuthenticationValidityDurationSeconds(60)
        }

        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(builder.build())
            generateKey()
        }
    }

    private fun encryptEnvelope(dataKey: ByteArray, wrappingKey: SecretKey): ByteArray {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, wrappingKey)
        return cipher.iv + cipher.doFinal(dataKey)
    }

    private fun decryptEnvelope(envelope: ByteArray, wrappingKey: SecretKey): ByteArray {
        require(envelope.size > 28) { "The secure vault key is damaged" }
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.DECRYPT_MODE, wrappingKey, GCMParameterSpec(128, envelope.copyOfRange(0, 12)))
        return cipher.doFinal(envelope.copyOfRange(12, envelope.size))
    }

    private fun writeEnvelope(bytes: ByteArray) {
        val output = atomicEnvelope.startWrite()
        try {
            output.write(bytes)
            output.fd.sync()
            atomicEnvelope.finishWrite(output)
        } catch (error: Exception) {
            atomicEnvelope.failWrite(output)
            throw error
        }
    }

    companion object {
        private val KEY_LOCK = Any()
    }
}

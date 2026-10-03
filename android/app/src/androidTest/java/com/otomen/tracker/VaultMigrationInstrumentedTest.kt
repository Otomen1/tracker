package com.otomen.tracker

import android.content.Context
import android.content.ContextWrapper
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import org.junit.runner.RunWith
import java.io.File
import javax.crypto.Cipher

/** Uses an isolated test directory, never the user's actual vault. */
@RunWith(AndroidJUnit4::class)
class VaultMigrationInstrumentedTest {
    private lateinit var directory: File
    private lateinit var context: Context
    @Before fun setup() {
        val host = InstrumentationRegistry.getInstrumentation().targetContext
        directory = File(host.cacheDir, "vault-migration-test").apply { deleteRecursively(); mkdirs() }
        context = object : ContextWrapper(host) { override fun getFilesDir(): File = directory }
        VaultSession.unlock(ByteArray(32) { (it + 1).toByte() })
    }
    @After fun cleanup() { VaultSession.lock(); directory.deleteRecursively() }
    private fun legacy(): JSONObject = JSONObject("""{
      "schemaVersion":3,"revision":0,"updatedAt":"2026-09-30T00:00:00Z","androidSetupComplete":true,
      "transactions":[{"id":"old","type":"expense","amount":12.345,"categoryId":"food","description":"Legacy lunch","date":"2026-09-30","accountId":"bank","createdAt":"2026-09-30T00:00:00Z","updatedAt":"2026-09-30T00:00:00Z"}],
      "accounts":[{"id":"bank","name":"Bank","currency":"MYR","openingBalance":100,"isActive":true,"createdAt":"2026-09-30T00:00:00Z","updatedAt":"2026-09-30T00:00:00Z"}],
      "categories":[{"id":"food","name":"Food","type":"expense","color":"#123456","isDefault":false,"createdAt":"2026-09-30T00:00:00Z"}],
      "settings":{"currency":"MYR","theme":"system","monthlySavingsGoal":0}
    }""")
    private fun writeLegacy(value: JSONObject) {
        val encrypted = VaultSession.withKey { key ->
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, key)
            cipher.updateAAD("com.otomen.tracker:vault:3".toByteArray())
            cipher.iv + cipher.doFinal(value.toString().toByteArray())
        }
        File(directory, "tracker-vault-v3.enc").writeBytes(encrypted)
    }
    @Test fun preservesLegacyCiphertextAndIndependentCheckpoint() {
        val old = legacy(); writeLegacy(old)
        val originalCiphertext = File(directory, "tracker-vault-v3.enc").readBytes()
        val store = EncryptedVaultStore(context)
        assertEquals(3, store.read().getInt("schemaVersion"))
        val candidate = JSONObject(old.toString()).put("schemaVersion", 4)
        val extra = JSONObject(candidate.getJSONArray("transactions").getJSONObject(0).toString()).put("id", "new").put("amount", 10)
        candidate.getJSONArray("transactions").put(extra)
        store.write(candidate, 0)
        assertEquals(4, store.read().getInt("schemaVersion"))
        assertEquals(12.345, store.read().getJSONArray("transactions").getJSONObject(0).getDouble("amount"), 0.0)
        assertArrayEquals(originalCiphertext, File(directory, "tracker-vault-pre-v4.enc").readBytes())
        store.write(store.read(), 1)
        assertArrayEquals(originalCiphertext, File(directory, "tracker-vault-pre-v4.enc").readBytes())
        assertEquals(1, store.restoreMigration().getJSONArray("transactions").length())
        assertEquals("old", store.read().getJSONArray("transactions").getJSONObject(0).getString("id"))
    }
    @Test fun rejectsInvalidDateWithoutReplacingCurrentVault() {
        val old = legacy(); writeLegacy(old)
        val candidate = JSONObject(old.toString())
        candidate.getJSONArray("transactions").getJSONObject(0).put("date", "2026-02-30")
        try { EncryptedVaultStore(context).write(candidate, 0); fail("Expected validation failure") } catch (_: IllegalArgumentException) { }
        assertEquals("2026-09-30", EncryptedVaultStore(context).read().getJSONArray("transactions").getJSONObject(0).getString("date"))
    }
    @Test fun rejectsFutureSchemaAndStaleRevision() {
        val old = legacy(); writeLegacy(old)
        val store = EncryptedVaultStore(context)
        try { store.write(JSONObject(old.toString()).put("schemaVersion", 5), 0); fail("Future format should be rejected") } catch (_: IllegalArgumentException) { }
        try { store.write(old, 99); fail("Stale write should fail") } catch (_: IllegalStateException) { }
        assertEquals(0, store.read().getLong("revision"))
    }
}

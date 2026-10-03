package com.otomen.tracker

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.provider.Settings
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "TrackerNative")
class TrackerNativePlugin : Plugin() {
    @com.getcapacitor.PluginMethod
    fun isAvailable(call: PluginCall) = call.resolve(JSObject().put("available", true))

    @com.getcapacitor.PluginMethod
    fun getCaptureStatus(call: PluginCall) {
        val packages = NotificationManagerCompat.getEnabledListenerPackages(context)
        val prefs = context.getSharedPreferences("tracker-capture", Activity.MODE_PRIVATE)
        call.resolve(JSObject()
            .put("notificationAccess", packages.contains(context.packageName))
            .put("alertsEnabled", NotificationManagerCompat.from(context).areNotificationsEnabled())
            .put("rytEnabled", prefs.getBoolean("source_ryt", false))
            .put("maeEnabled", prefs.getBoolean("source_mae", false)))
    }

    @com.getcapacitor.PluginMethod
    fun setSources(call: PluginCall) {
        context.getSharedPreferences("tracker-capture", Activity.MODE_PRIVATE).edit()
            .putBoolean("source_ryt", call.getBoolean("ryt", false) == true)
            .putBoolean("source_mae", call.getBoolean("mae", false) == true)
            .apply()
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun openNotificationAccess(call: PluginCall) {
        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun requestPrivateAlerts(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 6102)
        }
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun listPending(call: PluginCall) = vaultAction(call) {
        val result = JSArray()
        val pending = SecurePendingStore(context).list()
        pending.items.forEach { result.put(it) }
        JSObject().put("items", result).put("error", pending.error)
    }

    @com.getcapacitor.PluginMethod
    fun discardPending(call: PluginCall) = vaultAction(call) {
        val id = call.getString("id") ?: throw IllegalArgumentException("Missing pending transaction id")
        if (!SecurePendingStore(context).remove(id)) throw IllegalStateException("Could not update the secure review inbox")
        JSObject()
    }

    @com.getcapacitor.PluginMethod
    fun dismissPendingError(call: PluginCall) = vaultAction(call) {
        SecurePendingStore(context).dismissError()
        JSObject()
    }

    @com.getcapacitor.PluginMethod
    fun consumeLaunchInbox(call: PluginCall) {
        activity.runOnUiThread { call.resolve(JSObject().put("open", (activity as? MainActivity)?.consumeOpenInbox() ?: false)) }
    }

    @com.getcapacitor.PluginMethod
    fun setReminder(call: PluginCall) = vaultAction(call) {
        ReminderScheduler.configure(context, call.getBoolean("enabled", false) == true, call.getString("time", "20:00")!!)
        JSObject()
    }

    @com.getcapacitor.PluginMethod
    fun getVaultStatus(call: PluginCall) {
        val store = EncryptedVaultStore(context)
        call.resolve(JSObject()
            .put("exists", store.exists())
            .put("unlocked", VaultSession.isUnlocked())
            .put("hasRecovery", store.hasRecovery()).put("hasMigrationRecovery", store.hasMigrationRecovery()))
    }

    @com.getcapacitor.PluginMethod
    fun lockVault(call: PluginCall) {
        VaultSession.lock()
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun readVault(call: PluginCall) = vaultAction(call) {
        JSObject().put("vault", JSObject.fromJSONObject(EncryptedVaultStore(context).read()))
    }

    @com.getcapacitor.PluginMethod
    fun initializeVault(call: PluginCall) = vaultAction(call) {
        val candidate = call.getObject("vault") ?: throw IllegalArgumentException("Vault data is required")
        val stored = EncryptedVaultStore(context).initialize(candidate)
        JSObject().put("vault", JSObject.fromJSONObject(stored))
    }

    @com.getcapacitor.PluginMethod
    fun writeVault(call: PluginCall) = vaultAction(call) {
        val candidate = call.getObject("vault") ?: throw IllegalArgumentException("Vault data is required")
        val expectedRevision = VaultRevision.parse(call.data.opt("expectedRevision"))
        val stored = EncryptedVaultStore(context).write(candidate, expectedRevision, call.getBoolean("restoring", false) == true)
        JSObject().put("vault", JSObject.fromJSONObject(stored))
    }

    @com.getcapacitor.PluginMethod
    fun restorePreviousVault(call: PluginCall) = vaultAction(call) {
        JSObject().put("vault", JSObject.fromJSONObject(EncryptedVaultStore(context).restorePrevious()))
    }

    @com.getcapacitor.PluginMethod
    fun restoreMigrationVault(call: PluginCall) = vaultAction(call) {
        JSObject().put("vault", JSObject.fromJSONObject(EncryptedVaultStore(context).restoreMigration()))
    }

    @com.getcapacitor.PluginMethod
    fun eraseVault(call: PluginCall) = vaultAction(call) {
        context.getSharedPreferences("tracker-capture", Activity.MODE_PRIVATE).edit().clear().commit()
        ReminderScheduler.configure(context, false, "20:00")
        context.getSharedPreferences("tracker-reminders", Activity.MODE_PRIVATE).edit().clear().commit()
        // Delete key material first. Any ciphertext left by an interrupted
        // cleanup is then cryptographically unrecoverable.
        VaultKeyManager(context).erase()
        EncryptedVaultStore(context).erase()
        SecurePendingStore(context).erase()
        JSObject()
    }

    @com.getcapacitor.PluginMethod
    fun authenticate(call: PluginCall) {
        val host = activity as? FragmentActivity ?: return call.reject("Authentication is unavailable")
        try {
            // Create the auth-bound wrapping key before the prompt so the
            // successful device authentication can authorize its first use.
            VaultKeyManager(context).prepare()
        } catch (error: Exception) {
            return call.reject("Device security could not prepare the encrypted vault", error)
        }
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        val availability = BiometricManager.from(host).canAuthenticate(authenticators)
        if (availability != BiometricManager.BIOMETRIC_SUCCESS) return call.reject("Set a device PIN or biometric lock first")
        host.runOnUiThread {
            val prompt = BiometricPrompt(host, ContextCompat.getMainExecutor(host), object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    try {
                        VaultKeyManager(context).unlockOrCreate()
                        call.resolve(JSObject().put("authenticated", true))
                    } catch (error: Exception) {
                        call.reject("The encrypted vault could not be unlocked", error)
                    }
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) { call.reject(errString.toString()) }
                override fun onAuthenticationFailed() { /* prompt remains open */ }
            })
            prompt.authenticate(BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock Tracker")
                .setSubtitle("Confirm your identity to view financial data")
                .setAllowedAuthenticators(authenticators)
                .build())
        }
    }

    private fun vaultAction(call: PluginCall, action: () -> JSObject) {
        try {
            if (!VaultSession.isUnlocked()) throw SecurityException("Tracker is locked")
            call.resolve(action())
        } catch (error: SecurityException) {
            call.reject(error.message ?: "Tracker is locked", "VAULT_LOCKED", error)
        } catch (error: Exception) {
            call.reject(error.message ?: "Secure storage operation failed", "VAULT_ERROR", error)
        }
    }
}

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
    fun listPending(call: PluginCall) {
        val result = JSArray()
        SecurePendingStore(context).list().forEach { result.put(it) }
        call.resolve(JSObject().put("items", result))
    }

    @com.getcapacitor.PluginMethod
    fun discardPending(call: PluginCall) {
        val id = call.getString("id") ?: return call.reject("Missing pending transaction id")
        SecurePendingStore(context).remove(id)
        call.resolve()
    }

    @com.getcapacitor.PluginMethod
    fun authenticate(call: PluginCall) {
        val host = activity as? FragmentActivity ?: return call.reject("Authentication is unavailable")
        val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or BiometricManager.Authenticators.DEVICE_CREDENTIAL
        val availability = BiometricManager.from(host).canAuthenticate(authenticators)
        if (availability != BiometricManager.BIOMETRIC_SUCCESS) return call.reject("Set a device PIN or biometric lock first")
        host.runOnUiThread {
            val prompt = BiometricPrompt(host, ContextCompat.getMainExecutor(host), object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    call.resolve(JSObject().put("authenticated", true))
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
}

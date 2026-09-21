package com.otomen.tracker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

class TrackerNotificationListener : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName || sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        val extras = sbn.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = (extras.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: extras.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
        if (text.isBlank()) return

        val appLabel = try {
            packageManager.getApplicationLabel(packageManager.getApplicationInfo(sbn.packageName, 0)).toString()
        } catch (_: Exception) { return }
        val provider = when {
            appLabel.contains("Ryt", true) || sbn.packageName.contains("ryt", true) -> "ryt"
            appLabel.equals("MAE", true) || sbn.packageName.contains("maybank", true) -> "mae"
            else -> return
        }
        val preferences = getSharedPreferences("tracker-capture", MODE_PRIVATE)
        if (!preferences.getBoolean("source_$provider", false)) return

        val parsed = NotificationParser.parse(appLabel, sbn.packageName, title, text, sbn.postTime) ?: return
        if (SecurePendingStore(this).add(parsed)) showPrivateReviewNotification(parsed.fingerprint)
    }

    private fun showPrivateReviewNotification(fingerprint: String) {
        val channelId = "tracker-review"
        val manager = getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(channelId, "Transaction review", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "Private alerts for transactions waiting for review"
            lockscreenVisibility = Notification.VISIBILITY_PRIVATE
            setShowBadge(true)
        })
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return
        val intent = Intent(this, MainActivity::class.java).apply {
            action = "com.otomen.tracker.REVIEW"
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("openInbox", true)
        }
        val pendingIntent = PendingIntent.getActivity(this, 41, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("New transaction to review")
            .setContentText("Open Tracker to confirm or discard it.")
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()
        manager.notify(fingerprint.take(8).hashCode(), notification)
    }
}

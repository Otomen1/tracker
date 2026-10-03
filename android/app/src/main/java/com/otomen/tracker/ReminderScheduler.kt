package com.otomen.tracker

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import java.util.Calendar

object ReminderScheduler {
    private fun pending(context: Context): PendingIntent = PendingIntent.getBroadcast(context, 7101, Intent(context, ReminderReceiver::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun configure(context: Context, enabled: Boolean, time: String) {
        require(Regex("^([01][0-9]|2[0-3]):[0-5][0-9]$").matches(time)) { "Invalid reminder time" }
        context.getSharedPreferences("tracker-reminders", Context.MODE_PRIVATE).edit().putBoolean("enabled", enabled).putString("time", time).commit()
        schedule(context)
    }
    fun schedule(context: Context) {
        val manager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        manager.cancel(pending(context))
        val prefs = context.getSharedPreferences("tracker-reminders", Context.MODE_PRIVATE)
        if (!prefs.getBoolean("enabled", false)) return
        val time = prefs.getString("time", "20:00")!!.split(":")
        val next = Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, time[0].toInt()); set(Calendar.MINUTE, time[1].toInt()); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }
        if (next.timeInMillis <= System.currentTimeMillis()) next.add(Calendar.DAY_OF_YEAR, 1)
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.timeInMillis, pending(context))
    }
    fun notify(context: Context) {
        if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(NotificationChannel("tracker-reminders", "Daily reminders", NotificationManager.IMPORTANCE_DEFAULT))
        val open = PendingIntent.getActivity(context, 7102, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        manager.notify(7101, NotificationCompat.Builder(context, "tracker-reminders").setSmallIcon(R.drawable.ic_stat_tracker).setContentTitle("Tracker").setContentText("Review your activity and log today's transactions.").setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setContentIntent(open).setAutoCancel(true).build())
    }
}

class ReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == null && context.getSharedPreferences("tracker-reminders", Context.MODE_PRIVATE).getBoolean("enabled", false)) ReminderScheduler.notify(context)
        ReminderScheduler.schedule(context)
    }
}

package com.cjhauser.nyanime

import android.content.Context
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadManager
import androidx.media3.exoplayer.offline.DownloadRequest
import androidx.media3.exoplayer.offline.DownloadService
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import androidx.core.app.NotificationCompat

/**
 * media3 download service. Runs HLS downloads (manifest + every segment)
 * through PlayerAssets' cache, so anything downloaded here plays back with
 * the network cut — the player reads the same SimpleCache.
 */
@UnstableApi
class AnimeDownloadService : DownloadService(
    FOREGROUND_ID,
    DEFAULT_FOREGROUND_NOTIFICATION_UPDATE_INTERVAL
) {
    override fun getDownloadManager(): DownloadManager =
        PlayerAssets.downloadManager(this)

    override fun getScheduler(): androidx.media3.exoplayer.scheduler.Scheduler? = null

    override fun getForegroundNotification(downloads: MutableList<Download>, notReferred: Int): Notification {
        val running = downloads.count { it.state == Download.STATE_DOWNLOADING }
        val done = downloads.count { it.state == Download.STATE_COMPLETED }
        val nm = getSystemService(NotificationManager::class.java)
        val open = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java).apply {
                putExtra("open", "library")
            },
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        return NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle("NyAnime downloads")
            .setContentText(
                when {
                    running > 0 -> "$running downloading, $done ready to watch offline"
                    done > 0 -> "$done ready to watch offline"
                    else -> "Preparing downloads…"
                }
            )
            .setContentIntent(open)
            .setOngoing(running > 0)
            .build()
    }

    companion object {
        const val CHANNEL = "downloads"
        const val FOREGROUND_ID = 1001

        fun ensureChannel(context: Context) {
            val nm = context.getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL, "Downloads", NotificationManager.IMPORTANCE_LOW)
            )
        }

        fun startDownload(context: Context, request: DownloadRequest) {
            ensureChannel(context)
            sendAddDownload(context, AnimeDownloadService::class.java, request, /* foreground= */ true)
        }
    }
}

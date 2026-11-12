package com.cjhauser.nyanime

import android.content.Context
import androidx.media3.common.util.UnstableApi
import androidx.media3.database.StandaloneDatabaseProvider
import androidx.media3.datasource.DataSource
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.datasource.cache.NoOpCacheEvictor
import androidx.media3.datasource.cache.SimpleCache
import androidx.media3.exoplayer.offline.DownloadManager
import java.io.File
import java.util.concurrent.Executors

/**
 * Shared media3 wiring: one cache, one HTTP data source (with the Referer the
 * stream CDN requires), one download manager. Both the player and the
 * download service read through the same cache, so an episode downloaded to
 * the device plays back identically with the network fully cut.
 */
@UnstableApi
object PlayerAssets {

    const val CACHE_DIR = "media_cache"

    @Volatile
    private var cacheInstance: SimpleCache? = null

    @Volatile
    private var downloadManagerInstance: DownloadManager? = null

    fun httpFactory(): DefaultHttpDataSource.Factory =
        DefaultHttpDataSource.Factory()
            .setDefaultRequestProperties(
                mapOf(
                    "Referer" to AnimeApi.STREAM_REFERER,
                    "Origin" to AnimeApi.STREAM_ORIGIN,
                    "User-Agent" to AnimeApi.USER_AGENT
                )
            )
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(20_000)
            .setReadTimeoutMs(60_000)

    fun cache(context: Context): SimpleCache =
        cacheInstance ?: synchronized(this) {
            cacheInstance ?: SimpleCache(
                File(context.filesDir, CACHE_DIR),
                NoOpCacheEvictor(),
                StandaloneDatabaseProvider(context)
            ).also { cacheInstance = it }
        }

    /** Read-through cache data source: serves downloaded bytes offline. */
    fun dataSourceFactory(context: Context): DataSource.Factory =
        CacheDataSource.Factory()
            .setCache(cache(context))
            .setUpstreamDataSourceFactory(DefaultDataSource.Factory(context, httpFactory()))
            .setCacheWriteDataSinkFactory(null) // playback never writes to the cache

    fun downloadManager(context: Context): DownloadManager =
        downloadManagerInstance ?: synchronized(this) {
            downloadManagerInstance ?: DownloadManager(
                context,
                StandaloneDatabaseProvider(context),
                cache(context),
                CacheDataSource.Factory()
                    .setCache(cache(context))
                    .setUpstreamDataSourceFactory(httpFactory()),
                Executors.newFixedThreadPool(3)
            ).also { downloadManagerInstance = it }
        }
}

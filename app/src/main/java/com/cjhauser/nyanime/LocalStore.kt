package com.cjhauser.nyanime

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Tiny JSON-file store for watch progress ("continue watching"). Episodes
 * below 95% watched surface here with their playback position so the player
 * can resume; completed entries disappear from continue-watching but keep
 * their history row.
 */
data class WatchEntry(
    val animeId: String,
    val animeTitle: String,
    val poster: String,
    val episodeKey: String,
    val episodeNumber: Double,
    val episodeTitle: String,
    val positionMs: Long,
    val durationMs: Long,
    val updatedAt: Long
) {
    val fractionWatched: Double
        get() = if (durationMs > 0) positionMs.toDouble() / durationMs else 0.0

    val isFinished: Boolean get() = durationMs > 0 && fractionWatched > 0.95
}

@OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
object LocalStore {

    private const val FILE = "watch_history.json"
    private const val LIMIT = 100

    @Synchronized
    fun load(context: Context): MutableList<WatchEntry> {
        return try {
            val raw = context.openFileInput(FILE).bufferedReader().readText()
            val arr = JSONArray(raw)
            (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                WatchEntry(
                    animeId = o.getString("animeId"),
                    animeTitle = o.getString("animeTitle"),
                    poster = o.optString("poster"),
                    episodeKey = o.getString("episodeKey"),
                    episodeNumber = o.getDouble("episodeNumber"),
                    episodeTitle = o.optString("episodeTitle"),
                    positionMs = o.getLong("positionMs"),
                    durationMs = o.getLong("durationMs"),
                    updatedAt = o.getLong("updatedAt")
                )
            }.toMutableList()
        } catch (_: Exception) {
            mutableListOf()
        }
    }

    @Synchronized
    fun save(context: Context, entries: List<WatchEntry>) {
        val arr = JSONArray()
        for (e in entries.take(LIMIT)) {
            arr.put(
                JSONObject()
                    .put("animeId", e.animeId)
                    .put("animeTitle", e.animeTitle)
                    .put("poster", e.poster)
                    .put("episodeKey", e.episodeKey)
                    .put("episodeNumber", e.episodeNumber)
                    .put("episodeTitle", e.episodeTitle)
                    .put("positionMs", e.positionMs)
                    .put("durationMs", e.durationMs)
                    .put("updatedAt", e.updatedAt)
            )
        }
        context.openFileOutput(FILE, Context.MODE_PRIVATE).use {
            it.write(arr.toString().toByteArray())
        }
    }

    @Synchronized
    fun record(
        context: Context,
        animeId: String,
        animeTitle: String,
        poster: String,
        episodeKey: String,
        episodeNumber: Double,
        episodeTitle: String,
        positionMs: Long,
        durationMs: Long
    ): List<WatchEntry> {
        val entries = load(context)
        entries.removeAll { it.episodeKey == episodeKey }
        entries.add(
            0,
            WatchEntry(
                animeId, animeTitle, poster, episodeKey, episodeNumber,
                episodeTitle, positionMs, durationMs, System.currentTimeMillis()
            )
        )
        save(context, entries)
        return entries
    }

    @Synchronized
    fun remove(context: Context, episodeKey: String): List<WatchEntry> {
        val entries = load(context)
        entries.removeAll { it.episodeKey == episodeKey }
        save(context, entries)
        return entries
    }
}

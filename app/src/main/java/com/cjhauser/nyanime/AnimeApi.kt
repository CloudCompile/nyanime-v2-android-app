package com.cjhauser.nyanime

import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Client for the animeapi instance (CloudCompile/animeapiapi) fronting the
 * aniwaves catalogue. Mirrors src/services/animeApiService.ts in the web app,
 * including the stream server-preference walk.
 *
 * The catalogue API is CORS-open, but that only matters for browsers: a
 * native app talks to it directly. The stream CDN pins CORS to its player
 * origin, which again only affects browsers — ExoPlayer ignores CORS, but it
 * MUST send the Referer header or segments 404.
 */
object AnimeApi {

    const val BASE = "https://animeapi.cjhauser.me"

    /** The Referer the stream CDN expects. Segments 404 without it. */
    const val STREAM_REFERER = "https://play.echovideo.ru/"
    const val STREAM_ORIGIN = "https://play.echovideo.ru"
    const val USER_AGENT =
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36"

    /** Servers that hand back a direct manifest, best first (from the web client). */
    private val SERVER_PREFERENCE = listOf("Vidplay", "MyCloud", "DatSaV", "BYFMS", "DGHG")

    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    // ---- Models -------------------------------------------------------------

    data class Anime(
        val id: String,          // slug, e.g. sousou-no-frieren-74575
        val dataId: String,      // numeric upstream id
        val title: String,
        val japaneseTitle: String = "",
        val poster: String = "",
        val showType: String = "",
        val sub: Int = 0,
        val dub: Int = 0,
        val eps: Int = 0,
        val rating: String = "",
        val description: String = "",
        val duration: String = "",
        val status: String = "",
        val genres: List<String> = emptyList(),
        val studios: List<String> = emptyList()
    )

    data class Episode(
        val key: String,         // accepted by /api/stream, e.g. 74575_1
        val number: Double,
        val title: String,
        val filler: Boolean = false,
        val subbed: Boolean = true,
        val dubbed: Boolean = false
    )

    data class ServerOption(val type: String, val serverName: String, val dataId: String, val serverId: String)

    data class SubtitleTrack(val file: String, val label: String)

    data class Stream(
        val file: String?,       // master playlist URL, null when embed-only
        val iframe: String?,
        val server: String,
        val type: String,
        val tracks: List<SubtitleTrack>,
        val introStart: Double,  // seconds
        val introEnd: Double,
        val servers: List<ServerOption>
    ) {
        val isPlayable: Boolean get() = !file.isNullOrBlank()
    }

    // ---- Low-level helpers ----------------------------------------------------

    class ApiError(message: String) : Exception(message)

    private fun get(path: String): JSONObject {
        val req = Request.Builder()
            .url("$BASE$path")
            .header("User-Agent", USER_AGENT)
            .header("Accept", "application/json")
            .build()
        http.newCall(req).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) throw ApiError("HTTP ${resp.code}")
            val root = JSONObject(body)
            if (root.optBoolean("success", true) == false) {
                throw ApiError(root.optString("message", "The anime API reported a failure."))
            }
            return when (val results = root.opt("results")) {
                is JSONObject -> results
                // /api/servers/:id answers with a bare array; normalize it so
                // listPayload() can find it under "data".
                is JSONArray -> JSONObject().put("data", results)
                else -> JSONObject()
            }
        }
    }

    /** The API returns fields as string OR number depending on the route. */
    private fun str(obj: JSONObject?, vararg keys: String): String {
        obj ?: return ""
        for (key in keys) {
            when (val v = obj.opt(key)) {
                is String -> if (v.isNotBlank()) return v
                is Number -> return v.toString()
            }
        }
        return ""
    }

    private fun num(obj: JSONObject?, vararg keys: String): Double {
        obj ?: return 0.0
        for (key in keys) {
            when (val v = obj.opt(key)) {
                is Number -> return v.toDouble()
                is String -> v.toDoubleOrNull()?.let { return it }
            }
        }
        return 0.0
    }

    private fun strList(obj: JSONObject?, key: String): List<String> {
        val arr = obj?.optJSONArray(key) ?: return emptyList()
        return (0 until arr.length()).mapNotNull { i ->
            when (val v = arr.opt(i)) {
                is String -> v
                is Number -> v.toString()
                else -> null
            }
        }
    }

    private fun animeAt(arr: JSONArray?, i: Int): Anime {
        val o = arr?.optJSONObject(i) ?: JSONObject()
        val tv = o.optJSONObject("tvInfo")
        // /api/info carries metadata in an "animeInfo" map instead of tvInfo.
        val info = o.optJSONObject("animeInfo")
        return Anime(
            id = str(o, "id"),
            dataId = str(o, "data_id", "dataId"),
            title = str(o, "title", "name"),
            japaneseTitle = str(o, "japanese_title", "japaneseTitle"),
            poster = str(o, "poster"),
            showType = str(tv, "showType").ifBlank { str(o, "showType", "type").ifBlank { str(info, "Type") } },
            sub = num(tv, "sub").toInt(),
            dub = num(tv, "dub").toInt(),
            eps = num(tv, "eps").toInt().let { if (it > 0) it else Regex("\\d+").find(str(info, "Episodes"))?.value?.toIntOrNull() ?: 0 },
            rating = str(o, "rating").ifBlank { str(info, "Scores") },
            description = str(o, "description", "plot"),
            duration = str(o, "duration").ifBlank { str(info, "Duration") },
            status = str(o, "status").ifBlank { str(info, "Status") },
            genres = strList(o, "genres").ifEmpty { strList(info, "Genre") },
            studios = strList(o, "studios").ifEmpty { strList(info, "Studios") }
        )
    }

    /** Lists hide under different keys per route (data / episodes / items / direct array). */
    private fun listPayload(results: JSONObject): JSONArray {
        for (key in listOf("data", "episodes", "items", "animes", "results")) {
            val arr = results.optJSONArray(key)
            if (arr != null) return arr
        }
        return JSONArray()
    }

    // ---- Endpoints --------------------------------------------------------------

    fun home(): List<Pair<String, List<Anime>>> {
        val results = get("/api/")
        val rows = mutableListOf<Pair<String, List<Anime>>>()
        // Known sections first, in a stable order (keys as the live API names them)...
        val known = listOf(
            "spotlights" to "Spotlight",
            "trending" to "Trending",
            "topAiring" to "Top Airing",
            "mostPopular" to "Most Popular",
            "mostFavorite" to "Most Favorite",
            "latestEpisode" to "Latest Episodes",
            "latestCompleted" to "Recently Completed",
            "topTen" to "Top 10",
            "today" to "Today",
            "topUpcoming" to "Top Upcoming"
        )
        for ((key, label) in known) {
            val arr = results.optJSONArray(key)
            if (arr != null && arr.length() > 0) rows.add(label to (0 until arr.length()).map { animeAt(arr, it) })
        }
        // ...then anything else the API adds later, generically.
        for (key in results.keys()) {
            if (key in known.map { it.first }) continue
            val arr = results.optJSONArray(key) ?: continue
            if (arr.length() == 0) continue
            val first = arr.optJSONObject(0) ?: continue
            if (first.has("title") && first.has("id")) {
                rows.add(
                    key.replace(Regex("([a-z])([A-Z])"), "$1 $2")
                        .replaceFirstChar { it.uppercase() } to
                        (0 until arr.length()).map { animeAt(arr, it) }
                )
            }
        }
        return rows
    }

    fun search(keyword: String): List<Anime> =
        listPayload(get("/api/search?keyword=${java.net.URLEncoder.encode(keyword, "UTF-8")}"))
            .let { arr -> (0 until arr.length()).map { animeAt(arr, it) } }

    fun info(id: String): Anime {
        val results = get("/api/info?id=${java.net.URLEncoder.encode(id, "UTF-8")}")
        // The API nests the entry under "data" — a bare `results` object has no
        // anime fields, so falling back to it would yield an all-blank Anime.
        val anime = results.optJSONObject("data") ?: results.optJSONObject("anime") ?: results
        return animeAt(JSONArray().put(anime), 0)
    }

    fun episodes(id: String): List<Episode> {
        val results = get("/api/episodes/${java.net.URLEncoder.encode(id, "UTF-8")}")
        val arr = listPayload(results)
        return (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            val rawId = str(o, "id")
            val epKey = str(o, "number", "episode_no").toDoubleOrNull()?.let { no ->
                if (rawId.contains("?ep=")) rawId.substringAfter("?ep=") else "${id.substringAfterLast('-')}_$no"
            } ?: str(o, "key")
            Episode(
                key = epKey,
                number = num(o, "number", "episode_no"),
                title = str(o, "title", "japanese_title").ifBlank { "Episode ${num(o, "number", "episode_no").toInt()}" },
                filler = o.optBoolean("filler", false),
                subbed = o.optBoolean("subbed", true),
                dubbed = o.optBoolean("dubbed", false)
            )
        }.filter { it.key.isNotBlank() }
    }

    fun servers(episodeKey: String): List<ServerOption> {
        val results = get("/api/servers/${java.net.URLEncoder.encode(episodeKey, "UTF-8")}")
        val arr = listPayload(results)
        return (0 until arr.length()).mapNotNull { i ->
            val o = arr.optJSONObject(i) ?: return@mapNotNull null
            ServerOption(
                type = if (str(o, "type").lowercase() == "dub") "dub" else "sub",
                serverName = str(o, "serverName", "server_name"),
                dataId = num(o, "data_id").let { if (it == 0.0) str(o, "data_id") else it.toString() },
                serverId = num(o, "server_id").let { if (it == 0.0) str(o, "server_id") else it.toString() }
            )
        }.filter { it.serverName.isNotBlank() }
    }

    /**
     * Resolve a playable stream. The API's default server pick is often an
     * embed page (unplayable), so when no explicit server is requested we ask
     * for the default first and then walk the alternatives in preference
     * order — identical to the web client's getStream().
     */
    fun stream(episodeKey: String, server: String? = null, type: String? = null, fallback: Boolean = false): Stream {
        fun request(serverName: String?): Stream {
            val q = StringBuilder("/api/stream")
            if (fallback) q.append("/fallback")
            q.append("?id=").append(java.net.URLEncoder.encode(episodeKey, "UTF-8"))
            if (!serverName.isNullOrBlank()) q.append("&server=").append(java.net.URLEncoder.encode(serverName, "UTF-8"))
            if (!type.isNullOrBlank()) q.append("&type=").append(type)
            val results = get(q.toString())
            val link = results.opt("streamingLink")?.let {
                if (it is JSONArray) it.optJSONObject(0) else it as? JSONObject
            } ?: JSONObject()
            val fileObj = link.optJSONObject("link") ?: JSONObject()
            val tracks = link.optJSONArray("tracks")?.let { arr ->
                (0 until arr.length()).mapNotNull { i ->
                    val t = arr.optJSONObject(i) ?: return@mapNotNull null
                    if (str(t, "kind") == "thumbnails") null
                    else SubtitleTrack(file = str(t, "file"), label = str(t, "label"))
                }
            }.orEmpty()
            return Stream(
                file = str(fileObj, "file").ifBlank { null },
                iframe = str(link, "iframe").ifBlank { null },
                server = str(link, "server"),
                type = str(link, "type"),
                tracks = tracks.filter { it.file.isNotBlank() },
                introStart = (link.optJSONArray("intro")?.optDouble(0) ?: 0.0),
                introEnd = (link.optJSONArray("intro")?.optDouble(1) ?: 0.0),
                servers = servers(episodeKey)
            )
        }

        if (!server.isNullOrBlank()) return request(server)
        val first = request(null)
        if (first.isPlayable) return first
        for (candidate in rankServers(first.servers, first.server)) {
            val next = request(candidate.serverName)
            if (next.isPlayable) return next
        }
        return first
    }

    private fun rankServers(servers: List<ServerOption>, exclude: String?): List<ServerOption> =
        servers
            .filter { it.serverName != exclude }
            .sortedBy { SERVER_PREFERENCE.indexOf(it.serverName).let { r -> if (r == -1) Int.MAX_VALUE else r } }
}

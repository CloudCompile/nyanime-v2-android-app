package com.cjhauser.nyanime

import android.content.Context
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.MimeTypes
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.offline.Download
import androidx.media3.exoplayer.offline.DownloadRequest
import androidx.media3.exoplayer.offline.DownloadService
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

private val NyanimeBg = Color(0xFF0F0F1E)
private val NyanimeSurface = Color(0xFF17172A)
private val NyanimeAccent = Color(0xFFB58FFF)

@UnstableApi
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        AnimeDownloadService.ensureChannel(this)
        setContent {
            MaterialTheme(
                darkColorScheme(
                    primary = NyanimeAccent,
                    background = NyanimeBg,
                    surface = NyanimeSurface,
                    onBackground = Color.White,
                    onSurface = Color.White,
                    surfaceVariant = Color(0xFF232340),
                    onSurfaceVariant = Color(0xFFBDBDCD)
                )
            ) {
                Surface(color = MaterialTheme.colorScheme.background) {
                    AppNav(startOnLibrary = intent?.getStringExtra("open") == "library")
                }
            }
        }
    }
}

@Composable
fun AppNav(startOnLibrary: Boolean) {
    val nav = rememberSaveable { mutableStateOf(if (startOnLibrary) "library" else "home") }
    when (nav.value) {
        "home" -> HomeScreen(
            onOpenSearch = { nav.value = "search" },
            onOpenLibrary = { nav.value = "library" },
            onOpenAnime = { nav.value = "details:${it}" }
        )
        "search" -> SearchScreen(onBack = { nav.value = "home" }, onOpenAnime = { nav.value = "details:$it" })
        "library" -> LibraryScreen(onBack = { nav.value = "home" }, onOpenAnime = { nav.value = "details:$it" })
        else -> {
            val payload = nav.value.removePrefix("details:").split("|||")
            DetailsScreen(
                animeId = payload[0],
                resumeKey = payload.getOrNull(1)?.takeIf { it.isNotBlank() },
                onBack = { nav.value = "home" }
            )
        }
    }
}

// ----------------------------------------------------------------------------------
// Shared bits
// ----------------------------------------------------------------------------------

@Composable
fun PosterCard(anime: AnimeApi.Anime, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .width(110.dp)
            .clickable(onClick = onClick)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(10.dp))
                .background(Color(0xFF232340))
        ) {
            if (anime.poster.isNotBlank()) {
                AsyncImage(
                    model = anime.poster,
                    contentDescription = anime.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
            if (anime.rating.isNotBlank()) {
                Text(
                    "★ ${anime.rating}",
                    color = Color(0xFFFFD54F),
                    fontSize = 10.sp,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(4.dp)
                        .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 4.dp, vertical = 1.dp)
                )
            }
        }
        Text(
            anime.title,
            fontSize = 12.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 4.dp)
        )
        if (anime.sub > 0 || anime.dub > 0) {
            Text(
                buildString {
                    if (anime.sub > 0) append("SUB ${anime.sub}")
                    if (anime.dub > 0) append(if (isNotEmpty()) " · DUB ${anime.dub}" else "DUB ${anime.dub}")
                },
                fontSize = 10.sp,
                color = NyanimeAccent,
                maxLines = 1
            )
        }
    }
}

@Composable
fun NyanimeTopBar(title: String, onLibrary: (() -> Unit)? = null, onSearch: (() -> Unit)? = null, onBack: (() -> Unit)? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(NyanimeBg)
            .statusBarsPadding()
            .padding(horizontal = 8.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        onBack?.let { back ->
            IconButton(onClick = back) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back") }
        }
        Text(
            "🌙",
            fontSize = 18.sp,
            modifier = Modifier.padding(start = if (onBack == null) 8.dp else 0.dp, end = 6.dp)
        )
        Text(
            title,
            fontWeight = FontWeight.Bold,
            fontSize = 20.sp,
            modifier = Modifier.weight(1f),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
        if (onLibrary != null) {
            IconButton(onClick = onLibrary) { Icon(Icons.Default.VideoLibrary, "Library") }
        }
        if (onSearch != null) {
            IconButton(onClick = onSearch) { Icon(Icons.Default.Search, "Search") }
        }
    }
}

// ----------------------------------------------------------------------------------
// Home
// ----------------------------------------------------------------------------------

@Composable
fun HomeScreen(onOpenSearch: () -> Unit, onOpenLibrary: () -> Unit, onOpenAnime: (String) -> Unit) {
    var rows by remember { mutableStateOf<List<Pair<String, List<AnimeApi.Anime>>>?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }

    LaunchedEffect(retry) {
        error = null
        rows = null
        try {
            rows = withContext(Dispatchers.IO) { AnimeApi.home() }
        } catch (e: Exception) {
            error = e.message ?: "Could not reach the catalogue."
        }
    }

    Column(Modifier.fillMaxSize()) {
        NyanimeTopBar("NyAnime", onLibrary = onOpenLibrary, onSearch = onOpenSearch)
        when {
            rows != null -> LazyColumn(Modifier.fillMaxSize()) {
                for ((label, animes) in rows!!) {
                    item(key = label) {
                        Text(
                            label,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier.padding(start = 16.dp, top = 14.dp, bottom = 6.dp)
                        )
                    }
                    item {
                        LazyRow(
                            contentPadding = PaddingValues(horizontal = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            items(animes) { anime ->
                                PosterCard(anime, onClick = { onOpenAnime(anime.id) })
                            }
                        }
                    }
                }
                item { Spacer(Modifier.height(24.dp)) }
            }
            error != null -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                val err = error
                if (err != null) {
                    Text("☁️", fontSize = 40.sp)
                    Text(err, color = MaterialTheme.colorScheme.onSurfaceVariant, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { retry++ }) { Text("Retry") }
                }
            }
            else -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
    }
}

// ----------------------------------------------------------------------------------
// Search
// ----------------------------------------------------------------------------------

@Composable
fun SearchScreen(onBack: () -> Unit, onOpenAnime: (String) -> Unit) {
    var query by rememberSaveable { mutableStateOf("") }
    var results by remember { mutableStateOf<List<AnimeApi.Anime>?>(null) }
    var loading by remember { mutableStateOf(false) }
    var searchTrigger by remember { mutableStateOf(0) }

    LaunchedEffect(searchTrigger) {
        val q = query.trim()
        if (q.length < 2) return@LaunchedEffect
        loading = true
        try {
            results = withContext(Dispatchers.IO) { AnimeApi.search(q) }
        } catch (e: Exception) {
            results = emptyList()
        }
        loading = false
    }

    Column(Modifier.fillMaxSize()) {
        NyanimeTopBar("Search", onBack = onBack)
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            placeholder = { Text("Search anime…") },
            singleLine = true,
            trailingIcon = {
                IconButton(onClick = {
                    searchTrigger++
                }) { Icon(Icons.Default.Search, "Search") }
            },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp)
        )
        Text(
            "Press search to look across the catalogue",
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(horizontal = 18.dp)
        )
        if (loading) {
            Box(Modifier.fillMaxWidth().padding(top = 24.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        LazyColumn(Modifier.fillMaxSize()) {
            items(results.orEmpty(), key = { it.id }) { anime ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onOpenAnime(anime.id) }
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        Modifier
                            .width(64.dp)
                            .aspectRatio(2f / 3f)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFF232340))
                    ) {
                        if (anime.poster.isNotBlank()) {
                            AsyncImage(anime.poster, null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                        }
                    }
                    Column(Modifier.padding(start = 12.dp).weight(1f)) {
                        Text(anime.title, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        val meta = buildString {
                            if (anime.showType.isNotBlank()) append(anime.showType)
                            if (anime.sub > 0) append(if (isNotEmpty()) " · SUB ${anime.sub}" else "SUB ${anime.sub}")
                            if (anime.dub > 0) append(" · DUB ${anime.dub}")
                        }
                        if (meta.isNotBlank()) {
                            Text(meta, fontSize = 12.sp, color = NyanimeAccent)
                        }
                        if (anime.japaneseTitle.isNotBlank()) {
                            Text(anime.japaneseTitle, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1)
                        }
                    }
                }
            }
        }
    }
}

// ----------------------------------------------------------------------------------
// Details + episodes
// ----------------------------------------------------------------------------------

@Composable
fun DetailsScreen(animeId: String, resumeKey: String?, onBack: () -> Unit) {
    var anime by remember { mutableStateOf<AnimeApi.Anime?>(null) }
    var episodes by remember { mutableStateOf<List<AnimeApi.Episode>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var resumeEpisode by remember { mutableStateOf<AnimeApi.Episode?>(null) }
    var retry by remember { mutableIntStateOf(0) }

    LaunchedEffect(retry) {
        error = null
        try {
            withContext(Dispatchers.IO) {
                anime = AnimeApi.info(animeId)
                episodes = AnimeApi.episodes(animeId)
                resumeKey?.let { rk -> episodes.firstOrNull { it.key == rk }?.let { resumeEpisode = it } }
            }
        } catch (e: Exception) {
            error = e.message ?: "Could not load this title."
        }
    }

    val context = LocalContext.current
    var openEpisode by remember { mutableStateOf<AnimeApi.Episode?>(null) }

    Column(Modifier.fillMaxSize()) {
        NyanimeTopBar(anime?.title ?: "Details", onBack = onBack)
        when {
            error != null -> Column(
                Modifier.fillMaxSize().padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(error ?: "", color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(12.dp))
                Button(onClick = { retry++ }) { Text("Retry") }
            }
            anime == null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
            else -> {
                Column(Modifier.fillMaxSize().padding(horizontal = 16.dp)) {
                    Row {
                        Box(
                            Modifier
                                .width(110.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(10.dp))
                                .background(Color(0xFF232340))
                        ) {
                            if (anime!!.poster.isNotBlank()) {
                                AsyncImage(anime!!.poster, null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            }
                        }
                        Column(Modifier.padding(start = 12.dp).weight(1f)) {
                            Text(anime!!.title, fontWeight = FontWeight.Bold, fontSize = 18.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            if (anime!!.japaneseTitle.isNotBlank()) {
                                Text(anime!!.japaneseTitle, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                            val meta = buildString {
                                if (anime!!.showType.isNotBlank()) append(anime!!.showType)
                                if (anime!!.duration.isNotBlank()) append(if (isNotEmpty()) " · ${anime!!.duration}" else anime!!.duration)
                                if (anime!!.status.isNotBlank()) append(" · ${anime!!.status}")
                            }
                            if (meta.isNotBlank()) Text(meta, fontSize = 12.sp, color = NyanimeAccent, modifier = Modifier.padding(top = 4.dp))
                            if (anime!!.genres.isNotEmpty()) {
                                Text(
                                    anime!!.genres.joinToString(" · "),
                                    fontSize = 11.sp,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.padding(top = 6.dp)
                                )
                            }
                            Spacer(Modifier.height(8.dp))
                            Text(
                                "${episodes.size} episodes",
                                fontSize = 13.sp,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                    if (anime!!.description.isNotBlank()) {
                        Text(
                            anime!!.description,
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 4,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(top = 10.dp)
                        )
                    }
                    if (resumeEpisode != null) {
                        Button(
                            onClick = { openEpisode = resumeEpisode },
                            modifier = Modifier.padding(top = 10.dp)
                        ) {
                            Icon(Icons.Default.PlayArrow, null)
                            Text("  Resume episode ${resumeEpisode!!.number.toInt()}")
                        }
                    }
                    Text(
                        "Episodes",
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        modifier = Modifier.padding(top = 14.dp, bottom = 4.dp)
                    )
                    LazyColumn(Modifier.fillMaxSize()) {
                        itemsIndexed(episodes, key = { _, e -> e.key }) { _, ep ->
                            var downloading by remember { mutableStateOf(false) }
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { openEpisode = ep }
                                    .padding(vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "${ep.number.toInt()}",
                                    fontWeight = FontWeight.Bold,
                                    color = NyanimeAccent,
                                    modifier = Modifier.width(36.dp)
                                )
                                Column(Modifier.weight(1f)) {
                                    Text(ep.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontSize = 13.sp)
                                    val tags = mutableListOf<String>()
                                    if (ep.filler) tags.add("filler")
                                    if (ep.dubbed) tags.add("dub")
                                    if (tags.isNotEmpty()) Text(tags.joinToString(" · "), fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                IconButton(
                                    onClick = {
                                        if (downloading) return@IconButton
                                        downloading = true
                                        CoroutineScope(Dispatchers.IO).launch {
                                            try {
                                                val stream = AnimeApi.stream(ep.key)
                                                val url = stream.file
                                                    ?: throw Exception("This episode's servers are embed-only right now.")
                                                val request = DownloadRequest.Builder(
                                                    ep.key, // id
                                                    android.net.Uri.parse(url)
                                                )
                                                    .setData(
                                                        JSONObject()
                                                            .put("animeId", animeId)
                                                            .put("animeTitle", anime?.title ?: "")
                                                            .put("poster", anime?.poster ?: "")
                                                            .put("episodeNumber", ep.number)
                                                            .put("episodeTitle", ep.title)
                                                            .toString().toByteArray()
                                                    )
                                                    .build()
                                                AnimeDownloadService.startDownload(context, request)
                                                withContext(Dispatchers.Main) {
                                                    Toast.makeText(context, "Downloading episode ${ep.number.toInt()}", Toast.LENGTH_SHORT).show()
                                                }
                                            } catch (e: Exception) {
                                                withContext(Dispatchers.Main) {
                                                    Toast.makeText(context, e.message ?: "Download failed", Toast.LENGTH_LONG).show()
                                                }
                                            }
                                            downloading = false
                                        }
                                    },
                                    enabled = !downloading
                                ) {
                                    Icon(
                                        Icons.Default.Download,
                                        "Download episode",
                                        tint = if (downloading) MaterialTheme.colorScheme.onSurfaceVariant else NyanimeAccent
                                    )
                                }
                            }
                            HorizontalDivider(color = Color(0xFF232340))
                        }
                    }
                }
            }
        }
    }

    openEpisode?.let { ep ->
        WatchOverlay(
            animeId = animeId,
            anime = anime,
            episode = ep,
            onClose = { openEpisode = null }
        )
    }
}

private fun ComponentActivity.lifecycleOwner() = this

// ----------------------------------------------------------------------------------
// Library (downloads + continue watching) — works fully offline for downloads
// ----------------------------------------------------------------------------------

@UnstableApi
@Composable
fun LibraryScreen(onBack: () -> Unit, onOpenAnime: (String) -> Unit) {
    val context = LocalContext.current
    var downloads by remember { mutableStateOf<List<Download>>(emptyList()) }
    var history by remember { mutableStateOf<List<WatchEntry>>(LocalStore.load(context)) }
    var refresh by remember { mutableIntStateOf(0) }

    // Poll the download manager; media3 has no push listener without wiring.
    LaunchedEffect(refresh) {
        while (true) {
            val list = withContext(Dispatchers.IO) {
                PlayerAssets.downloadManager(context).currentDownloads
                    .sortedByDescending { it.request.id }
            }
            downloads = list
            delay(1500)
        }
    }
    LaunchedEffect(Unit) { while (true) { delay(4000); history = LocalStore.load(context) } }

    Column(Modifier.fillMaxSize()) {
        NyanimeTopBar("Library", onBack = onBack)
        Text(
            "Continue watching",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            modifier = Modifier.padding(start = 16.dp, top = 10.dp, bottom = 4.dp)
        )
        val continueWatching = history.filter { !it.isFinished }
        if (continueWatching.isEmpty()) {
            Text(
                "Nothing yet — start an episode and it will show up here.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        } else {
            LazyColumn(Modifier.height(220.dp)) {
                items(continueWatching, key = { it.episodeKey }) { entry ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onOpenAnime("${entry.animeId}|||${entry.episodeKey}") }
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            Modifier
                                .width(72.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color(0xFF232340))
                        ) {
                            if (entry.poster.isNotBlank()) {
                                AsyncImage(entry.poster, null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
                            }
                        }
                        Column(Modifier.weight(1f).padding(start = 10.dp)) {
                            Text(entry.animeTitle, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(
                                "EP ${entry.episodeNumber.toInt()} — ${entry.episodeTitle}",
                                fontSize = 12.sp,
                                color = NyanimeAccent,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            LinearProgressIndicator(
                                progress = { entry.fractionWatched.toFloat().coerceIn(0f, 1f) },
                                modifier = Modifier.padding(top = 6.dp).fillMaxWidth(0.7f)
                            )
                        }
                        IconButton(onClick = {
                            history = LocalStore.remove(context, entry.episodeKey)
                        }) {
                            Icon(Icons.Default.Close, "Remove", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }

        HorizontalDivider(color = Color(0xFF232340), modifier = Modifier.padding(vertical = 8.dp))

        Text(
            "Offline downloads",
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            modifier = Modifier.padding(start = 16.dp, bottom = 4.dp)
        )
        if (downloads.isEmpty()) {
            Text(
                "No downloads yet — tap the ⬇ on any episode to save it for offline.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
        }
        LazyColumn(Modifier.fillMaxSize()) {
            items(downloads, key = { it.request.id }) { dl ->
                val meta = JSONObject(String(dl.request.data))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable {
                            if (dl.state == Download.STATE_COMPLETED) {
                                onOpenAnime("${meta.optString("animeId")}|||${dl.request.id}")
                            }
                        }
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        when (dl.state) {
                            Download.STATE_COMPLETED -> Icons.Default.CheckCircle
                            Download.STATE_DOWNLOADING, Download.STATE_QUEUED -> Icons.Default.Downloading
                            Download.STATE_FAILED -> Icons.Default.Error
                            else -> Icons.Default.CloudDownload
                        },
                        null,
                        tint = when (dl.state) {
                            Download.STATE_COMPLETED -> Color(0xFF9CCC65)
                            Download.STATE_FAILED -> Color(0xFFFF8A80)
                            else -> NyanimeAccent
                        }
                    )
                    Column(Modifier.weight(1f).padding(start = 10.dp)) {
                        Text(
                            meta.optString("animeTitle").ifBlank { dl.request.id },
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        val percent = if (dl.contentLength > 0 && dl.bytesDownloaded > 0) {
                            String.format("%.0f%%", dl.bytesDownloaded * 100.0 / dl.contentLength)
                        } else ""
                        Text(
                            when (dl.state) {
                                Download.STATE_DOWNLOADING, Download.STATE_QUEUED -> "Downloading $percent"
                                Download.STATE_COMPLETED -> "Ready to watch offline"
                                Download.STATE_FAILED -> "Failed"
                                else -> "Stopped"
                            },
                            fontSize = 12.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    IconButton(onClick = {
                        DownloadService.sendRemoveDownload(context, AnimeDownloadService::class.java, dl.request.id, false)
                        refresh++
                    }) {
                        Icon(Icons.Default.Delete, "Delete download", tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
        }
    }
}

// ----------------------------------------------------------------------------------
// Watch overlay (player)
// ----------------------------------------------------------------------------------

@UnstableApi
@Composable
fun WatchOverlay(
    animeId: String,
    anime: AnimeApi.Anime?,
    episode: AnimeApi.Episode,
    onClose: () -> Unit
) {
    val context = LocalContext.current
    var stream by remember { mutableStateOf<AnimeApi.Stream?>(null) }
    var streamError by remember { mutableStateOf<String?>(null) }
    var selectedServer by remember { mutableStateOf<String?>(null) }
    var selectedType by remember { mutableStateOf<String?>(null) }
    var loadingStream by remember { mutableStateOf(true) }
    var positionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var showSkip by remember { mutableStateOf(false) }

    suspend fun resolve(server: String?, type: String?) {
        loadingStream = true
        streamError = null
        try {
            stream = withContext(Dispatchers.IO) { AnimeApi.stream(episode.key, server, type) }
            if (stream?.isPlayable != true) {
                streamError = "No direct stream available for this episode right now."
            }
        } catch (e: Exception) {
            streamError = e.message ?: "Could not resolve the stream."
        }
        loadingStream = false
    }

    LaunchedEffect(episode.key) { resolve(null, null) }

    val player = remember {
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(PlayerAssets.dataSourceFactory(context)))
            .build()
            .apply {
                addListener(object : Player.Listener {
                    override fun onPositionDiscontinuity(reason: Int) = Unit
                    override fun onPlaybackStateChanged(state: Int) = Unit
                    override fun onIsPlayingChanged(isPlaying: Boolean) { /* position saved below */ }
                })
            }
    }

    DisposableEffect(stream?.file, selectedServer, selectedType) {
        val url = stream?.file
        if (url != null) {
            val subs = stream!!.tracks.map { track ->
                MediaItem.SubtitleConfiguration.Builder(android.net.Uri.parse(track.file))
                    .setMimeType(MimeTypes.TEXT_VTT)
                    .setLabel(track.label.ifBlank { "Subs" })
                    .build()
            }
            val item = MediaItem.Builder()
                .setUri(url)
                .setMediaMetadata(
                    MediaMetadata.Builder()
                        .setTitle("${anime?.title ?: ""} — EP ${episode.number.toInt()}")
                        .build()
                )
                .setSubtitleConfigurations(subs)
                .build()
            player.setMediaItem(item)
            player.prepare()
            player.playWhenReady = true
        }
        onDispose { player.stop() }
    }

    // Save progress periodically and on dispose.
    DisposableEffect(episode.key) {
        val ticker = kotlinx.coroutines.CoroutineScope(Dispatchers.Main).launch {
            while (true) {
                delay(5000)
                if (player.isPlaying) {
                    positionMs = player.currentPosition
                    durationMs = player.duration.coerceAtLeast(0)
                    LocalStore.record(
                        context, animeId, anime?.title ?: "", anime?.poster ?: "",
                        episode.key, episode.number, episode.title, positionMs, durationMs
                    )
                }
            }
        }
        onDispose {
            ticker.cancel()
            if (player.duration > 0) {
                LocalStore.record(
                    context, animeId, anime?.title ?: "", anime?.poster ?: "",
                    episode.key, episode.number, episode.title,
                    player.currentPosition.coerceAtLeast(0), player.duration
                )
            }
            player.release()
        }
    }

    // Skip-intro button.
    LaunchedEffect(stream, player) {
        val intro = stream
        while (true) {
            delay(500)
            if (intro != null && intro.introEnd > intro.introStart && intro.introStart > 0) {
                showSkip = player.currentPosition / 1000.0 in intro.introStart..intro.introEnd
            }
        }
    }

    Column(
        Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Top bar
        Row(
            Modifier
                .fillMaxWidth()
                .background(NyanimeBg)
                .statusBarsPadding()
                .padding(horizontal = 4.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onClose) { Icon(Icons.Default.Close, "Close", tint = Color.White) }
            Column(Modifier.weight(1f)) {
                Text(anime?.title ?: "Now playing", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text("Episode ${episode.number.toInt()} — ${episode.title}", color = Color(0xFFBDBDCD), fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Text(
                if (stream?.server?.isNotBlank() == true) "${stream?.server} · ${stream?.type}" else "",
                color = NyanimeAccent,
                fontSize = 11.sp,
                modifier = Modifier.padding(end = 8.dp)
            )
        }

        // Player surface
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).background(Color.Black)) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        this.player = player
                        useController = true
                    }
                },
                modifier = Modifier.fillMaxSize()
            )
            if (loadingStream) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            if (showSkip) {
                Button(
                    onClick = {
                        stream?.let { player.seekTo((it.introEnd * 1000).toLong()) }
                        showSkip = false
                    },
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .padding(16.dp)
                ) { Text("Skip intro") }
            }
        }

        // Server / audio switcher
        Column(Modifier.fillMaxSize().padding(12.dp)) {
            val err = streamError
            if (err != null) {
                Text(err, color = Color(0xFFFF8A80), fontSize = 13.sp)
            }
            val serverList = stream?.servers.orEmpty()
            if (serverList.isNotEmpty()) {
                Text("Servers", color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, modifier = Modifier.padding(top = 8.dp, bottom = 4.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    items(serverList) { s ->
                        FilterChip(
                            selected = s.serverName == (selectedServer ?: stream?.server),
                            onClick = {
                                selectedServer = s.serverName
                                selectedType = s.type
                                player.clearMediaItems()
                            },
                            label = { Text("${s.serverName} (${s.type})", fontSize = 11.sp) }
                        )
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "Downloaded episodes play from storage, so they work with the network off.",
                color = Color(0xFF8F8FA3),
                fontSize = 11.sp
            )
        }
    }

    // React to server/type changes.
    LaunchedEffect(selectedServer, selectedType) {
        if (selectedServer != null) resolve(selectedServer, selectedType)
    }
}

package com.cjhauser.nyanime

import android.app.Application
import coil.ImageLoader
import coil.ImageLoaderFactory
import okhttp3.OkHttpClient

/**
 * The poster host (static.aniwaves.tv, Cloudflare-fronted) returns 403 for the
 * `okhttp/4.x` User-Agent that Coil's default client sends — every poster
 * 403'd and rendered blank. Present the same browser identity the catalogue
 * API expects instead.
 */
class NyanimeApp : Application(), ImageLoaderFactory {
    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .okHttpClient {
                OkHttpClient.Builder()
                    .addInterceptor { chain ->
                        chain.proceed(
                            chain.request().newBuilder()
                                .header("User-Agent", AnimeApi.USER_AGENT)
                                .header("Referer", "https://aniwaves.ru/")
                                .build()
                        )
                    }
                    .build()
            }
            .crossfade(true)
            .build()
}

package com.cjhauser.nyanime

import android.annotation.SuppressLint
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.ActivityResultLauncher
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity

/**
 * NyAnime Android shell — loads the deployed web app (https://nyanime.cjhauser.me)
 * in a full-featured WebView: media playback, downloads to the shared Downloads
 * folder, file uploads, fullscreen video, and in-app back navigation.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private var fullscreenView: View? = null
    private var uploadCallback: ValueCallback<Array<Uri>>? = null

    private lateinit var uploadLauncher: ActivityResultLauncher<Intent>

    private val homeUrl = "https://nyanime.cjhauser.me"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        uploadLauncher = registerForActivityResult(
            ActivityResultContracts.StartActivityForResult()
        ) { result ->
            val parsed = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
            uploadCallback?.onReceiveValue(parsed ?: emptyArray())
            uploadCallback = null
        }

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (fullscreenView != null) {
                    exitFullscreen()
                } else if (this@MainActivity::webView.isInitialized && webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })

        val root = FrameLayout(this)
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            configureSettings()
            setDownloadListener { url, agent, disposition, mime, _ -> enqueueDownload(url, agent, disposition, mime) }
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    val scheme = request.url.scheme ?: return false
                    return when (scheme) {
                        "http", "https" -> false
                        else -> {
                            runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                            true
                        }
                    }
                }
            }
            webChromeClient = object : WebChromeClient() {
                // ---- File uploads (avatar images, etc.) ----
                override fun onShowFileChooser(
                    view: WebView,
                    callback: ValueCallback<Array<Uri>>,
                    params: FileChooserParams
                ): Boolean {
                    uploadCallback?.onReceiveValue(null)
                    uploadCallback = callback
                    return runCatching {
                        uploadLauncher.launch(params.createIntent())
                        true
                    }.getOrElse {
                        uploadCallback = null
                        false
                    }
                }

                // ---- Fullscreen video ----
                override fun onShowCustomView(view: View, callback: CustomViewCallback) {
                    if (fullscreenView != null) {
                        callback.onCustomViewHidden()
                        return
                    }
                    fullscreenView = view
                    window.decorView.systemUiVisibility =
                        View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
                        View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    rootView().addView(
                        view,
                        FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT
                        )
                    )
                }

                override fun onHideCustomView() = exitFullscreen()
            }
            CookieManager.getInstance().setAcceptCookie(true)
            if (savedInstanceState == null) loadUrl(homeUrl)
        }
        root.addView(webView)
        setContentView(root)
    }

    private fun rootView(): ViewGroup = window.decorView as ViewGroup

    @SuppressLint("SetJavaScriptEnabled")
    private fun WebView.configureSettings() {
        settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false
            loadWithOverviewMode = true
            useWideViewPort = true
            builtInZoomControls = true
            displayZoomControls = false
            setSupportZoom(true)
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        }
        CookieManager.getInstance().apply {
            setAcceptCookie(true)
            setAcceptThirdPartyCookies(this@configureSettings, true)
        }
    }

    private fun enqueueDownload(url: String, userAgent: String, disposition: String?, mimeType: String?) {
        try {
            val fileName = URLUtil.guessFileName(url, disposition, mimeType)
            val request = DownloadManager.Request(Uri.parse(url)).apply {
                setTitle(fileName)
                setDescription("NyAnime download")
                setMimeType(mimeType)
                addRequestHeader("cookie", CookieManager.getInstance().getCookie(url).orEmpty())
                addRequestHeader("User-Agent", userAgent)
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            }
            (getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager).enqueue(request)
            Toast.makeText(this, "Downloading $fileName", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Download failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun exitFullscreen() {
        fullscreenView?.let { view ->
            (view.parent as? ViewGroup)?.removeView(view)
            window.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_VISIBLE
        }
        fullscreenView = null
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        if (this::webView.isInitialized) webView.saveState(outState)
    }

    override fun onDestroy() {
        exitFullscreen()
        if (this::webView.isInitialized) {
            webView.destroy()
        }
        super.onDestroy()
    }
}

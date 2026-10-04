package com.msa.mirrorcraft;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

public class MainActivity extends Activity {
    private static final String START_URL = "https://" + WebViewAssetLoader.DEFAULT_DOMAIN + "/assets/studio/index.html";
    private static final int FILE_CHOOSER_REQUEST = 4401;

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;

    @Override
    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(10, 14, 26));
        getWindow().setNavigationBarColor(Color.rgb(10, 14, 26));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(10, 14, 26));
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(false);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");
        webView.setWebViewClient(new LocalAssetClient(assetLoader));
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params
            ) {
                if (filePathCallback != null) {
                    filePathCallback.onReceiveValue(null);
                }
                filePathCallback = callback;

                Intent intent;
                try {
                    intent = params.createIntent();
                } catch (Exception ignored) {
                    intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    intent.setType("application/json");
                }
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (Exception error) {
                    filePathCallback = null;
                    Toast.makeText(MainActivity.this, "No file picker is available", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });

        if (savedInstanceState == null) {
            webView.loadUrl(START_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == FILE_CHOOSER_REQUEST) {
            ValueCallback<Uri[]> callback = filePathCallback;
            filePathCallback = null;
            if (callback == null) return;
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            callback.onReceiveValue(result);
            return;
        }
        super.onActivityResult(requestCode, resultCode, data);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private final class LocalAssetClient extends WebViewClient {
        private final WebViewAssetLoader assetLoader;

        private LocalAssetClient(WebViewAssetLoader assetLoader) {
            this.assetLoader = assetLoader;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            WebResourceResponse response = assetLoader.shouldInterceptRequest(request.getUrl());
            if (response != null) {
                return response;
            }
            return super.shouldInterceptRequest(view, request);
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (WebViewAssetLoader.DEFAULT_DOMAIN.equalsIgnoreCase(uri.getHost())) {
                return false;
            }
            Intent browser = new Intent(Intent.ACTION_VIEW, uri);
            try {
                startActivity(browser);
            } catch (Exception ignored) {
                Toast.makeText(MainActivity.this, "No app can open this link", Toast.LENGTH_SHORT).show();
            }
            return true;
        }
    }

    private final class AndroidBridge {
        @JavascriptInterface
        public void reportStudioReady() {
            Log.i("MirrorCraftRuntime", "STUDIO_READY");
        }

        @JavascriptInterface
        public void saveBase64File(String filename, String base64, String mime) {
            byte[] bytes;
            try {
                bytes = Base64.decode(base64, Base64.DEFAULT);
            } catch (IllegalArgumentException error) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Export data is invalid", Toast.LENGTH_SHORT).show());
                return;
            }

            try {
                saveToDownloads(filename, bytes, mime);
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Saved to Downloads/MirrorCraft", Toast.LENGTH_LONG).show());
            } catch (Exception error) {
                runOnUiThread(() -> Toast.makeText(MainActivity.this, "Unable to save export", Toast.LENGTH_LONG).show());
            }
        }
    }

    private void saveToDownloads(String filename, byte[] bytes, String mime) throws IOException {
        String safeName = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
        if (safeName.isEmpty()) safeName = "mirrorcraft-export.bin";

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, safeName);
            values.put(MediaStore.Downloads.MIME_TYPE, mime == null || mime.isEmpty() ? "application/octet-stream" : mime);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MirrorCraft");
            values.put(MediaStore.Downloads.IS_PENDING, 1);

            Uri destination = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (destination == null) throw new IOException("Unable to create download");

            try (OutputStream output = getContentResolver().openOutputStream(destination)) {
                if (output == null) throw new IOException("Unable to open download");
                output.write(bytes);
            } catch (Exception error) {
                getContentResolver().delete(destination, null, null);
                throw error;
            }

            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(destination, values, null, null);
            return;
        }

        File root = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (root == null) throw new IOException("Downloads directory unavailable");
        File directory = new File(root, "MirrorCraft");
        if (!directory.exists() && !directory.mkdirs()) throw new IOException("Unable to create export directory");
        File destination = new File(directory, safeName);
        try (OutputStream output = new FileOutputStream(destination)) {
            output.write(bytes);
        }
    }
}

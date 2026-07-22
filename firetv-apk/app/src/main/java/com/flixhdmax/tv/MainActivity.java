package com.flixhdmax.tv;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

public final class MainActivity extends Activity {
    private FrameLayout rootView;
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN |
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );
        enterImmersiveMode();

        rootView = new FrameLayout(this);
        rootView.setBackgroundColor(Color.rgb(5, 5, 5));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(5, 5, 5));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setSupportMultipleWindows(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        settings.setUserAgentString(
            settings.getUserAgentString() + " FlixHDMaxTV/2.0 FireTV"
        );

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new TVPlayerBridge(), "AndroidTVPlayer");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(
                View view,
                CustomViewCallback callback
            ) {
                if (customView != null) {
                    callback.onCustomViewHidden();
                    return;
                }

                customView = view;
                customViewCallback = callback;
                rootView.addView(
                    customView,
                    new FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                );
                webView.setVisibility(View.GONE);
                enterImmersiveMode();
            }

            @Override
            public void onHideCustomView() {
                hideCustomView();
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(
                WebView view,
                WebResourceRequest request
            ) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();

                if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                    return false;
                }

                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    return true;
                } catch (Exception ignored) {
                    return true;
                }
            }
        });

        rootView.addView(
            webView,
            new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        );
        setContentView(rootView);

        webView.loadUrl(BuildConfig.APP_URL);
        webView.requestFocus();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();

        if (!isTVRemoteKey(keyCode) || webView == null) {
            return super.dispatchKeyEvent(event);
        }

        if (event.getAction() == KeyEvent.ACTION_UP) {
            return true;
        }

        String script =
            "Boolean(window.__flixTVHandleNativeKey && " +
            "window.__flixTVHandleNativeKey(" + keyCode + "))";

        webView.evaluateJavascript(script, result -> {
            if (keyCode != KeyEvent.KEYCODE_BACK) return;

            boolean handled = "true".equalsIgnoreCase(result);
            if (handled) return;

            runOnUiThread(() -> {
                if (customView != null) {
                    hideCustomView();
                } else if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    finish();
                }
            });
        });

        return true;
    }

    @Override
    public void onBackPressed() {
        if (customView != null) {
            hideCustomView();
            return;
        }

        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        if (webView != null) webView.onResume();
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        hideCustomView();

        if (webView != null) {
            webView.removeJavascriptInterface("AndroidTVPlayer");
            webView.loadUrl("about:blank");
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }

        super.onDestroy();
    }

    private boolean isTVRemoteKey(int keyCode) {
        return keyCode == KeyEvent.KEYCODE_DPAD_LEFT ||
            keyCode == KeyEvent.KEYCODE_DPAD_RIGHT ||
            keyCode == KeyEvent.KEYCODE_DPAD_UP ||
            keyCode == KeyEvent.KEYCODE_DPAD_DOWN ||
            keyCode == KeyEvent.KEYCODE_DPAD_CENTER ||
            keyCode == KeyEvent.KEYCODE_ENTER ||
            keyCode == KeyEvent.KEYCODE_NUMPAD_ENTER ||
            keyCode == KeyEvent.KEYCODE_BACK;
    }

    private void hideCustomView() {
        if (customView == null || rootView == null) return;

        rootView.removeView(customView);
        customView = null;
        webView.setVisibility(View.VISIBLE);

        if (customViewCallback != null) {
            customViewCallback.onCustomViewHidden();
            customViewCallback = null;
        }

        webView.requestFocus();
        enterImmersiveMode();
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN |
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private final class TVPlayerBridge {
        @JavascriptInterface
        public boolean isAvailable() {
            return true;
        }

        @JavascriptInterface
        public void play(String url, String title) {
            if (url == null || url.trim().isEmpty()) return;

            runOnUiThread(() -> {
                Intent intent = new Intent(MainActivity.this, NativePlayerActivity.class);
                intent.putExtra(NativePlayerActivity.EXTRA_URL, url);
                intent.putExtra(
                    NativePlayerActivity.EXTRA_TITLE,
                    title == null ? "FlixHDMax" : title
                );
                startActivity(intent);
            });
        }
    }
}

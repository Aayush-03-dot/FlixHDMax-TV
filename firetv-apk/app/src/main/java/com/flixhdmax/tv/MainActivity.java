package com.flixhdmax.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.FrameLayout;

import org.json.JSONObject;

public final class MainActivity extends Activity {
    private FrameLayout rootView;
    private WebView webView;
    private View customView;
    private WebChromeClient.CustomViewCallback customViewCallback;
    private AlertDialog inputDialog;

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
        rootView.setBackgroundColor(Color.rgb(3, 3, 3));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(3, 3, 3));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        if (BuildConfig.DEBUG) webView.clearCache(true);

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
            settings.getUserAgentString() + " FlixHDMaxTV/4.0 FireTV"
        );

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);
        cookieManager.setAcceptThirdPartyCookies(webView, true);

        webView.addJavascriptInterface(new TVPlayerBridge(), "AndroidTVPlayer");
        webView.addJavascriptInterface(new TVInputBridge(), "AndroidTVInput");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
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
        if (inputDialog != null && inputDialog.isShowing()) {
            return super.dispatchKeyEvent(event);
        }

        int keyCode = event.getKeyCode();

        if (!isTVRemoteKey(keyCode) || webView == null) {
            return super.dispatchKeyEvent(event);
        }

        if (event.getAction() == KeyEvent.ACTION_UP) return true;

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
        if (inputDialog != null && inputDialog.isShowing()) {
            inputDialog.dismiss();
            return;
        }

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
        if (inputDialog != null) {
            inputDialog.dismiss();
            inputDialog = null;
        }

        hideCustomView();

        if (webView != null) {
            webView.removeJavascriptInterface("AndroidTVPlayer");
            webView.removeJavascriptInterface("AndroidTVInput");
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

    private void sendInputValue(String fieldKey, String value) {
        if (webView == null) return;

        String script =
            "window.__flixTVSetInput && window.__flixTVSetInput(" +
            JSONObject.quote(fieldKey) + "," + JSONObject.quote(value) + ")";
        webView.evaluateJavascript(script, null);
    }

    private final class TVInputBridge {
        @JavascriptInterface
        public void hideKeyboard() {
            runOnUiThread(() -> {
                InputMethodManager inputMethodManager =
                    (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);

                if (inputMethodManager == null || webView == null) return;

                View focusedView = getCurrentFocus();
                View tokenView = focusedView == null ? webView : focusedView;
                inputMethodManager.hideSoftInputFromWindow(tokenView.getWindowToken(), 0);
            });
        }

        @JavascriptInterface
        public void openKeyboard(
            String fieldKey,
            String currentValue,
            String label,
            String inputType
        ) {
            runOnUiThread(() -> {
                if (inputDialog != null && inputDialog.isShowing()) {
                    inputDialog.dismiss();
                }

                EditText input = new EditText(MainActivity.this);
                input.setSingleLine(true);
                input.setText(currentValue == null ? "" : currentValue);
                input.setSelection(input.getText().length());
                input.setTextSize(20f);
                input.setPadding(28, 20, 28, 20);
                input.setImeOptions(EditorInfo.IME_ACTION_DONE);

                String normalizedType = inputType == null ? "text" : inputType.toLowerCase();
                if ("password".equals(normalizedType)) {
                    input.setInputType(
                        InputType.TYPE_CLASS_TEXT |
                        InputType.TYPE_TEXT_VARIATION_PASSWORD
                    );
                } else if ("email".equals(normalizedType)) {
                    input.setInputType(
                        InputType.TYPE_CLASS_TEXT |
                        InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
                    );
                } else if ("search".equals(normalizedType)) {
                    input.setInputType(
                        InputType.TYPE_CLASS_TEXT |
                        InputType.TYPE_TEXT_VARIATION_NORMAL
                    );
                } else {
                    input.setInputType(InputType.TYPE_CLASS_TEXT);
                }

                String dialogTitle =
                    label == null || label.trim().isEmpty() ? "Enter text" : label;

                AlertDialog dialog = new AlertDialog.Builder(MainActivity.this)
                    .setTitle(dialogTitle)
                    .setView(input)
                    .setPositiveButton("Done", null)
                    .setNegativeButton("Cancel", null)
                    .setNeutralButton("Clear", null)
                    .create();

                inputDialog = dialog;

                dialog.setOnShowListener(ignored -> {
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(view -> {
                        sendInputValue(fieldKey, input.getText().toString());
                        dialog.dismiss();
                        if (webView != null) webView.requestFocus();
                    });

                    dialog.getButton(AlertDialog.BUTTON_NEUTRAL).setOnClickListener(view -> {
                        input.setText("");
                        input.requestFocus();
                    });

                    input.setOnEditorActionListener((view, actionId, event) -> {
                        if (
                            actionId == EditorInfo.IME_ACTION_DONE ||
                            (event != null && event.getKeyCode() == KeyEvent.KEYCODE_ENTER)
                        ) {
                            sendInputValue(fieldKey, input.getText().toString());
                            dialog.dismiss();
                            if (webView != null) webView.requestFocus();
                            return true;
                        }
                        return false;
                    });

                    input.requestFocus();
                    Window window = dialog.getWindow();
                    if (window != null) {
                        window.setSoftInputMode(
                            WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE
                        );
                    }

                    input.postDelayed(() -> {
                        InputMethodManager manager =
                            (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                        if (manager != null) {
                            boolean shown = manager.showSoftInput(
                                input,
                                InputMethodManager.SHOW_IMPLICIT
                            );
                            if (!shown) {
                                manager.toggleSoftInput(
                                    InputMethodManager.SHOW_FORCED,
                                    InputMethodManager.HIDE_IMPLICIT_ONLY
                                );
                            }
                        }
                    }, 220);
                });

                dialog.setOnDismissListener(ignored -> {
                    inputDialog = null;
                    enterImmersiveMode();
                    if (webView != null) webView.requestFocus();
                });

                dialog.show();
            });
        }
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

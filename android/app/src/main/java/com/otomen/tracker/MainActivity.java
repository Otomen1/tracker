package com.otomen.tracker;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean pendingOpenInbox = false;
    public boolean consumeOpenInbox() { boolean pending = pendingOpenInbox; pendingOpenInbox = false; return pending; }
    private final Handler lockHandler = new Handler(Looper.getMainLooper());
    private final Runnable lockVault = VaultSession.INSTANCE::lock;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        registerPlugin(TrackerNativePlugin.class);
        super.onCreate(savedInstanceState);
        boolean isDebuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(isDebuggable);
        WebSettings settings = bridge.getWebView().getSettings();
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(bridge.getWebView());
                if (insets != null && insets.isVisible(WindowInsetsCompat.Type.ime())) {
                    new WindowInsetsControllerCompat(getWindow(), bridge.getWebView()).hide(WindowInsetsCompat.Type.ime());
                    return;
                }
                bridge.getWebView().evaluateJavascript(
                    "window.dispatchEvent(new Event('tracker-back', {cancelable:true}))",
                    result -> { if (!"false".equals(result)) finish(); }
                );
            }
        });
        openInboxIfRequested(getIntent());
    }

    @Override
    public void onStart() {
        super.onStart();
        lockHandler.removeCallbacks(lockVault);
    }

    @Override
    public void onStop() {
        super.onStop();
        lockHandler.removeCallbacks(lockVault);
        lockHandler.postDelayed(lockVault, 30_000L);
    }

    @Override
    public void onDestroy() {
        lockHandler.removeCallbacks(lockVault);
        if (isFinishing()) VaultSession.INSTANCE.lock();
        super.onDestroy();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openInboxIfRequested(intent);
    }

    private void openInboxIfRequested(Intent intent) {
        if (intent == null || !intent.getBooleanExtra("openInbox", false) || bridge == null) return;
        pendingOpenInbox = true;
        intent.removeExtra("openInbox");
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript("window.dispatchEvent(new Event('tracker-open-inbox'))", null));
    }
}

package com.otomen.tracker;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
        bridge.getWebView().postDelayed(() -> bridge.getWebView().evaluateJavascript("window.location.assign('/inbox')", null), 400);
    }
}

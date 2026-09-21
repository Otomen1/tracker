package com.otomen.tracker;

import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TrackerNativePlugin.class);
        super.onCreate(savedInstanceState);
        openInboxIfRequested(getIntent());
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

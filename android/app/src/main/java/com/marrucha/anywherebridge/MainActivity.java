package com.marrucha.anywherebridge;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

import fi.iki.elonen.NanoHTTPD;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    private static LocalAirplaneServer server;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Keep screen on while hosting
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Start local server before webview initializes
        startAirplaneServer();

        super.onCreate(savedInstanceState);

        // Prevent Android Edge-to-Edge status bar / cutout / gesture bar from overlapping WebView
        View contentView = findViewById(android.R.id.content);
        if (contentView != null) {
            ViewCompat.setOnApplyWindowInsetsListener(contentView, (v, windowInsets) -> {
                Insets insets = windowInsets.getInsets(
                        WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
                );
                v.setPadding(insets.left, insets.top, insets.right, insets.bottom);
                return WindowInsetsCompat.CONSUMED;
            });
        }
    }

    private synchronized void startAirplaneServer() {
        if (server == null || !server.isAlive()) {
            try {
                server = new LocalAirplaneServer(getApplicationContext());
                server.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
                Log.i(TAG, "LocalAirplaneServer started successfully on port " + LocalAirplaneServer.PORT);
            } catch (Exception e) {
                Log.e(TAG, "Failed to start LocalAirplaneServer: " + e.getMessage(), e);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (isFinishing() && server != null) {
            Log.i(TAG, "Activity finishing. Shutting down LocalAirplaneServer.");
            server.fullShutdown();
            server = null;
        }
        super.onDestroy();
    }
}

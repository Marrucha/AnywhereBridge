package com.marrucha.anywherebridge;

import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;

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

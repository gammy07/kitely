package com.arnavgadgil.kitely;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // You MUST register your custom plugin here so Capacitor knows it exists!
        registerPlugin(LocationStoragePlugin.class);

        super.onCreate(savedInstanceState);
    }
}
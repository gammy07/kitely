package com.arnavgadgil.kitely;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(name = "LocationStorage")
public class LocationStoragePlugin extends Plugin {

    @PluginMethod
    public void saveLocation(PluginCall call) {
        try {
            Double latitude = call.getDouble("latitude");
            Double longitude = call.getDouble("longitude");


            String unit = call.getString("unit", "kmh");

            if (latitude == null || longitude == null) {
                call.reject("Missing latitude or longitude in JS push.");
                return;
            }

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("kitely", Context.MODE_PRIVATE);

            prefs.edit()
                    .putString("latitude", String.valueOf(latitude))
                    .putString("longitude", String.valueOf(longitude))
                    .putString("unit", unit)
                    .apply();

            Log.d("KITELY_WIDGET", "SAVED LAT = " + latitude + " LON = " + longitude);

            // Force every Kitely widget to update immediately
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName component = new ComponentName(context, KitelyWidget.class);
            int[] ids = manager.getAppWidgetIds(component);

            if (ids.length > 0) {
                KitelyWidget.updateAllWidgets(context);
            }

            // Tell JS it was successful
            call.resolve();

        } catch (Exception e) {
            // If Java crashes, print to Logcat AND send the error back to the JS alerttt
            Log.e("KITELY_WIDGET", "Plugin Crash", e);
            call.reject("Java crash: " + e.getMessage());
        }
    }
}
package com.arnavgadgil.kitely;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import android.util.Log;
import android.graphics.Color;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import android.app.PendingIntent;
import android.content.Intent;



public class KitelyWidget extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        final PendingResult pendingResult = goAsync();

        new Thread(() -> {
            try {
                updateAllWidgetsSync(context, manager, ids);
            } finally {
                pendingResult.finish();
            }
        }).start();
    }

    public static void updateAllWidgets(Context context) {
        AppWidgetManager manager = AppWidgetManager.getInstance(context);
        android.content.ComponentName component = new android.content.ComponentName(context, KitelyWidget.class);
        int[] ids = manager.getAppWidgetIds(component);

        new Thread(() -> {
            updateAllWidgetsSync(context, manager, ids);
        }).start();
    }

    private static void updateAllWidgetsSync(Context context, AppWidgetManager manager, int[] ids) {
        SharedPreferences prefs = context.getSharedPreferences("kitely", Context.MODE_PRIVATE);
        String latitude = prefs.getString("latitude", null);
        String longitude = prefs.getString("longitude", null);
        String unit = prefs.getString("unit", "kmh");

        if (latitude == null || longitude == null) {
            for (int id : ids) showNoLocation(context, manager, id);
            return;
        }

        try {
            String urlString = "https://api.open-meteo.com/v1/forecast?latitude=" + latitude +
                    "&longitude=" + longitude +
                    "&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m" +
                    "&wind_speed_unit=" + unit;

            URL url = new URL(urlString);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);

            BufferedReader reader = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                response.append(line);
            }
            reader.close();
            connection.disconnect();

            JSONObject json = new JSONObject(response.toString());
            JSONObject current = json.getJSONObject("current");

            double speed = current.getDouble("wind_speed_10m");
            double direction = current.getDouble("wind_direction_10m");
            double gusts = current.optDouble("wind_gusts_10m", 0.0);

            String unitLabel = " km/h";
            if (unit.equals("mph")) unitLabel = " mph";
            else if (unit.equals("ms")) unitLabel = " m/s";
            else if (unit.equals("kn")) unitLabel = " kn";

            double speedInKmh = speed;
            if (unit.equals("mph")) {
                speedInKmh = speed * 1.60934;
            } else if (unit.equals("ms")) {
                speedInKmh = speed * 3.6;
            } else if (unit.equals("kn")) {
                speedInKmh = speed * 1.852;
            }

            int speedColor = getSpeedColor(speedInKmh);

            for (int widgetId : ids) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kitely);

                views.setTextViewText(R.id.wind_speed, Math.round(speed * 10.0) / 10.0 + unitLabel);
                views.setTextColor(R.id.wind_speed, speedColor);
                views.setInt(R.id.wind_arrow, "setColorFilter", speedColor);

                views.setTextViewText(R.id.wind_direction, getDirectionText(direction));
                views.setTextViewText(R.id.wind_gusts, "Gusts: " + Math.round(gusts * 10.0) / 10.0 + unitLabel);

                views.setFloat(R.id.wind_arrow, "setRotation", (float) direction + 180);

                Intent intent = new Intent(context, MainActivity.class);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                        context,
                        0,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);



                manager.updateAppWidget(widgetId, views);
            }
        } catch (Exception e) {
            Log.e("KITELY_WIDGET", "Widget weather failed", e);
        }
    }

    private static void showNoLocation(Context context, AppWidgetManager manager, int widgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_kitely);
        views.setTextViewText(R.id.wind_speed, "Open Kitely");
        views.setTextViewText(R.id.wind_direction, "Location needed");
        manager.updateAppWidget(widgetId, views);
    }

    private static String getDirectionText(double degrees) {
        if (degrees >= 337.5 || degrees < 22.5) return "N";
        if (degrees < 67.5) return "NE";
        if (degrees < 112.5) return "E";
        if (degrees < 157.5) return "SE";
        if (degrees < 202.5) return "S";
        if (degrees < 247.5) return "SW";
        if (degrees < 292.5) return "W";
        return "NW";
    }

    private static int getSpeedColor(double speedInKmh) {
        if (speedInKmh < 10) {
            return Color.parseColor("#60a5fa"); // Light Blue
        } else if (speedInKmh < 20) {
            return Color.parseColor("#34d399"); // Mint Green
        } else if (speedInKmh < 35) {
            return Color.parseColor("#fb9a24"); // Orange
        } else if (speedInKmh < 50) {
            return Color.parseColor("#ea07cc"); // Pink/Magenta
        } else {
            return Color.parseColor("#ad14ff"); // Purple
        }
    }
}
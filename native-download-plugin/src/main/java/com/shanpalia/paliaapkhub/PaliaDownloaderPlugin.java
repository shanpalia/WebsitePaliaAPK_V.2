package com.shanpalia.paliaapkhub;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Environment;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PaliaDownloader")
public class PaliaDownloaderPlugin extends Plugin {
    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String filename = call.getString("filename", "PaliaAPK-HUB-App.apk");

        if (url == null || url.trim().isEmpty()) {
            call.reject("Download URL is missing");
            return;
        }

        try {
            DownloadManager manager =
                (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);

            if (manager == null) {
                call.reject("Android Download Manager is unavailable");
                return;
            }

            Uri uri = Uri.parse(url);
            if (uri.getScheme() == null || (!"http".equalsIgnoreCase(uri.getScheme())
                    && !"https".equalsIgnoreCase(uri.getScheme()))) {
                call.reject("Only HTTP/HTTPS APK URLs are supported");
                return;
            }

            String safeFilename = filename.replaceAll("[^A-Za-z0-9._ -]", "_");
            if (!safeFilename.toLowerCase().endsWith(".apk")) safeFilename += ".apk";

            DownloadManager.Request request = new DownloadManager.Request(uri);
            request.setTitle(safeFilename);
            request.setDescription("Downloading from PaliaAPK HUB");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setDestinationInExternalPublicDir(
                Environment.DIRECTORY_DOWNLOADS, safeFilename
            );

            long id = manager.enqueue(request);

            JSObject result = new JSObject();
            result.put("downloadId", id);
            result.put("filename", safeFilename);
            result.put("status", "queued");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Unable to start APK download: " + e.getMessage(), e);
        }
    }
}
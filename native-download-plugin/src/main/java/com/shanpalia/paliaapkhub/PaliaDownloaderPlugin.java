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

            DownloadManager.Request request =
                    new DownloadManager.Request(Uri.parse(url));

            request.setTitle(filename);
            request.setDescription("Downloading from PaliaAPK HUB");
            request.setMimeType("application/vnd.android.package-archive");
            request.setNotificationVisibility(
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS,
                    filename
            );

            long downloadId = manager.enqueue(request);

            JSObject result = new JSObject();
            result.put("downloadId", downloadId);
            result.put("filename", filename);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Unable to start APK download: " + e.getMessage(), e);
        }
    }
}

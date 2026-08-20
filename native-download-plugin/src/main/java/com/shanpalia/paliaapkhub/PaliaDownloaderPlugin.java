package com.shanpalia.paliaapkhub;

import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Environment;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

@CapacitorPlugin(name = "PaliaDownloader")
public class PaliaDownloaderPlugin extends Plugin {
    private static final String PREFS = "palia_downloader";
    private static final String KEY_FILE_PREFIX = "file_";
    private static final String KEY_TOTAL_PREFIX = "total_";

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void download(PluginCall call) {
        String url = call.getString("url");
        String filename = call.getString("filename", "PaliaAPK-HUB-App.apk");
        long expectedTotal = call.getLong("expectedTotalBytes", 0L);

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
            String scheme = uri.getScheme();
            if (scheme == null ||
                    (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))) {
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
                    DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
            request.setAllowedOverMetered(true);
            request.setAllowedOverRoaming(true);
            request.setDestinationInExternalPublicDir(
                    Environment.DIRECTORY_DOWNLOADS, safeFilename);

            long id = manager.enqueue(request);

            prefs().edit()
                    .putString(KEY_FILE_PREFIX + id, safeFilename)
                    .putLong(KEY_TOTAL_PREFIX + id, Math.max(0L, expectedTotal))
                    .apply();

            JSObject result = new JSObject();
            result.put("downloadId", id);
            result.put("filename", safeFilename);
            result.put("expectedTotalBytes", expectedTotal);
            result.put("status", "queued");
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Unable to start APK download: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void getProgress(PluginCall call) {
        long id = call.getLong("downloadId", -1L);
        if (id < 0) {
            call.reject("Invalid download ID");
            return;
        }

        DownloadManager manager =
                (DownloadManager) getContext().getSystemService(Context.DOWNLOAD_SERVICE);
        if (manager == null) {
            call.reject("Android Download Manager is unavailable");
            return;
        }

        Cursor cursor = null;
        try {
            cursor = manager.query(new DownloadManager.Query().setFilterById(id));
            if (cursor == null || !cursor.moveToFirst()) {
                call.reject("Download not found");
                return;
            }

            int status = cursor.getInt(
                    cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));
            long managerBytes = cursor.getLong(
                    cursor.getColumnIndexOrThrow(
                            DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            long managerTotal = cursor.getLong(
                    cursor.getColumnIndexOrThrow(
                            DownloadManager.COLUMN_TOTAL_SIZE_BYTES));

            String filename = prefs().getString(KEY_FILE_PREFIX + id, "");
            long expectedTotal = prefs().getLong(KEY_TOTAL_PREFIX + id, 0L);

            // Some Android/HTTP combinations keep DownloadManager's byte counter at 0
            // while the destination file is already growing. Read the real file too.
            long fileBytes = 0L;
            if (!filename.isEmpty()) {
                File file = new File(
                        Environment.getExternalStoragePublicDirectory(
                                Environment.DIRECTORY_DOWNLOADS),
                        filename);
                if (file.exists()) {
                    fileBytes = file.length();
                }
            }

            long bytes = Math.max(managerBytes, fileBytes);
            long total = managerTotal > 0 ? managerTotal : expectedTotal;

            JSObject result = new JSObject();
            result.put("status", status);
            result.put("bytesDownloaded", bytes);
            result.put("totalBytes", total);
            result.put("filename", filename);
            result.put("source", fileBytes > managerBytes ? "file" : "download_manager");
            call.resolve(result);

            if (status == DownloadManager.STATUS_SUCCESSFUL ||
                    status == DownloadManager.STATUS_FAILED) {
                prefs().edit()
                        .remove(KEY_FILE_PREFIX + id)
                        .remove(KEY_TOTAL_PREFIX + id)
                        .apply();
            }
        } catch (Exception e) {
            call.reject("Unable to read download progress: " + e.getMessage(), e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }

    @PluginMethod
    public void openInstaller(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null || filename.trim().isEmpty()) {
            call.reject("Filename is missing");
            return;
        }

        try {
            File apk = new File(
                    Environment.getExternalStoragePublicDirectory(
                            Environment.DIRECTORY_DOWNLOADS),
                    filename);
            if (!apk.exists()) {
                call.reject("Downloaded APK file was not found");
                return;
            }

            Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION |
                    Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Unable to open Android installer: " + e.getMessage(), e);
        }
    }
}

package com.shanpalia.paliaapkhub;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.concurrent.atomic.AtomicLong;

@CapacitorPlugin(name = "PaliaDownloader")
public class PaliaDownloaderPlugin extends Plugin {
    private static final String PREFS = "palia_downloader";
    private static final String KEY_FILE_PREFIX = "file_";
    private static final String KEY_TOTAL_PREFIX = "total_";

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final AtomicLong idGenerator =
            new AtomicLong(System.currentTimeMillis());
    private final HashMap<Long, Thread> activeDownloads = new HashMap<>();

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private File downloadDirectory() {
        // App-owned storage: the APK is NOT placed in Android's public
        // DownloadManager/Downloads queue.
        File dir = new File(getContext().getExternalFilesDir(null), "PaliaAPK-HUB");
        if (!dir.exists()) dir.mkdirs();
        return dir;
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

        Uri uri = Uri.parse(url);
        String scheme = uri.getScheme();
        if (scheme == null ||
                (!"http".equalsIgnoreCase(scheme) &&
                 !"https".equalsIgnoreCase(scheme))) {
            call.reject("Only HTTP/HTTPS APK URLs are supported");
            return;
        }

        String safeFilename =
                filename.replaceAll("[^A-Za-z0-9._ -]", "_");
        if (!safeFilename.toLowerCase().endsWith(".apk")) {
            safeFilename += ".apk";
        }

        final long id = idGenerator.incrementAndGet();

        prefs().edit()
                .putString(KEY_FILE_PREFIX + id, safeFilename)
                .putLong(KEY_TOTAL_PREFIX + id, Math.max(0L, expectedTotal))
                .apply();

        JSObject result = new JSObject();
        result.put("downloadId", id);
        result.put("filename", safeFilename);
        result.put("expectedTotalBytes", expectedTotal);
        result.put("status", "running");
        result.put("downloadMode", "app_owned");
        call.resolve(result);

        Thread worker = new Thread(() ->
                performDownload(id, url, safeFilename, expectedTotal),
                "PaliaAPK-HUB-Downloader-" + id);

        synchronized (activeDownloads) {
            activeDownloads.put(id, worker);
        }
        worker.start();
    }

    private void performDownload(long id, String url, String filename,
                                 long expectedTotal) {
        File finalFile = new File(downloadDirectory(), filename);
        File tempFile = new File(downloadDirectory(), filename + ".part");

        HttpURLConnection connection = null;
        InputStream input = null;
        FileOutputStream output = null;

        try {
            if (tempFile.exists()) tempFile.delete();

            URL target = new URL(url);
            connection = (HttpURLConnection) target.openConnection();
            connection.setRequestMethod("GET");
            connection.setConnectTimeout(20000);
            connection.setReadTimeout(30000);
            connection.setInstanceFollowRedirects(true);
            connection.setRequestProperty("Accept", "application/vnd.android.package-archive,*/*");

            int response = connection.getResponseCode();
            if (response < 200 || response >= 300) {
                throw new Exception("Server returned HTTP " + response);
            }

            long serverTotal = connection.getContentLengthLong();
            final long total = serverTotal > 0 ? serverTotal : expectedTotal;

            input = new BufferedInputStream(connection.getInputStream());
            output = new FileOutputStream(tempFile, false);

            byte[] buffer = new byte[64 * 1024];
            long downloaded = 0L;
            long lastEvent = 0L;

            emitProgress(id, 1, downloaded, total, filename);

            int read;
            while ((read = input.read(buffer)) != -1) {
                output.write(buffer, 0, read);
                downloaded += read;

                long now = System.currentTimeMillis();
                if (now - lastEvent >= 200) {
                    lastEvent = now;
                    emitProgress(id, 2, downloaded, total, filename);
                }
            }

            output.flush();
            output.close();
            output = null;

            if (finalFile.exists()) finalFile.delete();
            if (!tempFile.renameTo(finalFile)) {
                throw new Exception("Could not finalize downloaded APK");
            }

            long actualSize = finalFile.length();
            long finalTotal = total > 0 ? total : actualSize;
            emitProgress(id, 8, actualSize, finalTotal, filename);

        } catch (Exception e) {
            if (tempFile.exists()) tempFile.delete();
            JSObject error = new JSObject();
            error.put("downloadId", id);
            error.put("status", 16);
            error.put("bytesDownloaded", 0);
            error.put("totalBytes", expectedTotal);
            error.put("filename", filename);
            error.put("downloadMode", "app_owned");
            error.put("error",
                    e.getMessage() == null ? "Download failed" : e.getMessage());
            notifyListeners("downloadProgress", error);
        } finally {
            try { if (input != null) input.close(); } catch (Exception ignored) {}
            try { if (output != null) output.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();

            synchronized (activeDownloads) {
                activeDownloads.remove(id);
            }
        }
    }

    private void emitProgress(long id, int status, long bytes,
                              long total, String filename) {
        mainHandler.post(() -> {
            JSObject data = new JSObject();
            data.put("downloadId", id);
            data.put("status", status);
            data.put("bytesDownloaded", bytes);
            data.put("totalBytes", total);
            data.put("filename", filename);
            data.put("source", "paliaapk_hub");
            data.put("downloadMode", "app_owned");
            notifyListeners("downloadProgress", data);
        });
    }

    @PluginMethod
    public void getProgress(PluginCall call) {
        long id = call.getLong("downloadId", -1L);
        if (id < 0) {
            call.reject("Invalid download ID");
            return;
        }

        String filename = prefs().getString(KEY_FILE_PREFIX + id, "");
        long expectedTotal = prefs().getLong(KEY_TOTAL_PREFIX + id, 0L);

        File finalFile = filename.isEmpty()
                ? null
                : new File(downloadDirectory(), filename);
        File partFile = filename.isEmpty()
                ? null
                : new File(downloadDirectory(), filename + ".part");

        long bytes = 0L;
        int status = 2; // running
        if (finalFile != null && finalFile.exists()) {
            bytes = finalFile.length();
            status = 8;
        } else if (partFile != null && partFile.exists()) {
            bytes = partFile.length();
        } else {
            synchronized (activeDownloads) {
                if (!activeDownloads.containsKey(id)) status = 16;
            }
        }

        JSObject result = new JSObject();
        result.put("downloadId", id);
        result.put("status", status);
        result.put("bytesDownloaded", bytes);
        result.put("totalBytes", expectedTotal);
        result.put("filename", filename);
        result.put("source", "paliaapk_hub");
        result.put("downloadMode", "app_owned");
        call.resolve(result);
    }

    @PluginMethod
    public void openInstaller(PluginCall call) {
        String filename = call.getString("filename");
        if (filename == null || filename.trim().isEmpty()) {
            call.reject("Filename is missing");
            return;
        }

        try {
            File apk = new File(downloadDirectory(), filename);
            if (!apk.exists()) {
                call.reject("Downloaded APK file was not found");
                return;
            }

            Uri apkUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk);

            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(
                    apkUri, "application/vnd.android.package-archive");
            intent.addFlags(
                    Intent.FLAG_GRANT_READ_URI_PERMISSION |
                    Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("opened", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject(
                    "Unable to open Android installer: " + e.getMessage(), e);
        }
    }
}

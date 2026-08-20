(function () {
  let nativePlugin = null;

  function isAndroidApp() {
    const C = window.Capacitor;
    return !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
  }

  async function getNativePlugin() {
    if (!isAndroidApp()) return null;
    const C = window.Capacitor;
    if (C.Plugins && C.Plugins.PaliaDownloader) return C.Plugins.PaliaDownloader;
    if (typeof C.registerPlugin === "function") {
      nativePlugin = nativePlugin || C.registerPlugin("PaliaDownloader");
      return nativePlugin;
    }
    return null;
  }

  window.startPaliaApkDownload = async function (url, filename, expectedTotalBytes) {
    if (!url) throw new Error("Download URL is missing");
    if (!isAndroidApp()) {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "PaliaAPK-HUB-App.apk";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return { fallback: true };
    }

    const p = await getNativePlugin();
    if (!p || typeof p.download !== "function") {
      throw new Error("Native downloader is not registered.");
    }

    return await p.download({
      url: String(url),
      filename: filename || "PaliaAPK-HUB-App.apk",
      expectedTotalBytes: Number(expectedTotalBytes || 0)
    });
  };

  window.getPaliaApkDownloadProgress = async function (downloadId) {
    const p = await getNativePlugin();
    if (!p || typeof p.getProgress !== "function") {
      throw new Error("Native progress API is not registered.");
    }
    return await p.getProgress({ downloadId: Number(downloadId) });
  };

  window.openPaliaApkInstaller = async function (filename) {
    const p = await getNativePlugin();
    if (!p || typeof p.openInstaller !== "function") {
      throw new Error("Native installer API is not registered.");
    }
    return await p.openInstaller({ filename: String(filename) });
  };
  window.listenPaliaApkDownloadProgress = async function (callback) {
    const p = await getNativePlugin();
    if (!p || typeof p.addListener !== "function") {
      throw new Error("Native download progress listener is not registered.");
    }
    return await p.addListener("downloadProgress", callback);
  };

})();

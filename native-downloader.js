(function () {
  let plugin = null;
  let nativeChecked = false;

  async function getNativeDownloader() {
    if (nativeChecked) return plugin;
    nativeChecked = true;

    try {
      const C = window.Capacitor;
      if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) {
        return null;
      }

      if (C.Plugins && C.Plugins.PaliaDownloader) {
        plugin = C.Plugins.PaliaDownloader;
      } else if (typeof C.registerPlugin === "function") {
        plugin = C.registerPlugin("PaliaDownloader");
      }

      return plugin;
    } catch (e) {
      console.error("PaliaDownloader initialization failed:", e);
      return null;
    }
  }

  window.startPaliaApkDownload = async function (url, filename) {
    if (!url) throw new Error("Download URL is missing");

    const C = window.Capacitor;
    const isNative = !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());

    if (isNative) {
      const p = await getNativeDownloader();
      if (!p || typeof p.download !== "function") {
        throw new Error("Native APK downloader is not available in this APK. Rebuild the APK after native downloader registration.");
      }
      return p.download({
        url: url,
        filename: filename || "PaliaAPK-HUB-App.apk"
      });
    }

    // Website fallback: normal browser download is allowed only on the website.
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "PaliaAPK-HUB-App.apk";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { fallback: true };
  };
})();
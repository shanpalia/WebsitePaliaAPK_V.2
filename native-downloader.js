(function () {
  let nativePlugin = null;

  function isAndroidApp() {
    const C = window.Capacitor;
    return !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
  }

  async function getNativePlugin() {
    if (!isAndroidApp()) return null;
    try {
      const C = window.Capacitor;
      if (C.Plugins && C.Plugins.PaliaDownloader) return C.Plugins.PaliaDownloader;
      if (typeof C.registerPlugin === "function") {
        nativePlugin = nativePlugin || C.registerPlugin("PaliaDownloader");
        return nativePlugin;
      }
    } catch (e) {
      console.error("PaliaDownloader registration failed:", e);
    }
    return null;
  }

  window.startPaliaApkDownload = async function (url, filename) {
    if (!url) throw new Error("Download URL is missing");

    if (isAndroidApp()) {
      const plugin = await getNativePlugin();
      if (!plugin || typeof plugin.download !== "function") {
        throw new Error("PaliaDownloader native plugin is not registered in this APK.");
      }
      return await plugin.download({
        url: String(url),
        filename: filename || "PaliaAPK-HUB-App.apk"
      });
    }

    // Website behavior only.
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
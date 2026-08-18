(function () {
  let plugin = null;

  async function getPlugin() {
    try {
      const C = window.Capacitor;
      if (!C || typeof C.isNativePlatform !== "function" || !C.isNativePlatform()) {
        return null;
      }

      if (C.Plugins && C.Plugins.PaliaDownloader) {
        return C.Plugins.PaliaDownloader;
      }

      if (typeof C.registerPlugin === "function") {
        plugin = plugin || C.registerPlugin("PaliaDownloader");
        return plugin;
      }
    } catch (e) {
      console.error("PaliaDownloader init failed:", e);
    }
    return null;
  }

  window.startPaliaApkDownload = async function (url, filename) {
    if (!url) throw new Error("Download URL is missing");

    const C = window.Capacitor;
    const isNative = !!(
      C &&
      typeof C.isNativePlatform === "function" &&
      C.isNativePlatform()
    );

    if (isNative) {
      const p = await getPlugin();

      if (!p || typeof p.download !== "function") {
        throw new Error(
          "Native PaliaDownloader is missing. Rebuild this APK with the native downloader configuration."
        );
      }

      return await p.download({
        url,
        filename: filename || "PaliaAPK-HUB-App.apk"
      });
    }

    // Website only: browser fallback is allowed outside the APK.
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
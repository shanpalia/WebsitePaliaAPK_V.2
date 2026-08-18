(function () {
  let pluginPromise;

  function getPlugin() {
    if (pluginPromise) return pluginPromise;
    pluginPromise = (async () => {
      if (!window.Capacitor || typeof window.Capacitor.registerPlugin !== "function") {
        return null;
      }
      try {
        const plugin = window.Capacitor.registerPlugin("PaliaDownloader");
        if (typeof window.Capacitor.isNativePlatform === "function" &&
            !window.Capacitor.isNativePlatform()) {
          return null;
        }
        return plugin;
      } catch (e) {
        console.warn("PaliaDownloader unavailable:", e);
        return null;
      }
    })();
    return pluginPromise;
  }

  window.startPaliaApkDownload = async function (url, filename) {
    if (!url) throw new Error("Download URL is missing");

    const plugin = await getPlugin();
    if (plugin && typeof plugin.download === "function") {
      return plugin.download({ url: url, filename: filename || "PaliaAPK-HUB-App.apk" });
    }

    // Browser fallback only. Native APK uses Android DownloadManager and stays in-app.
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

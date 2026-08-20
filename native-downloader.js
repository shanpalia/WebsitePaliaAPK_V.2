(function () {
  let nativePlugin = null;

  function isNativeAndroid() {
    const C = window.Capacitor;
    return !!(C && typeof C.isNativePlatform === "function" &&
      C.isNativePlatform() && /android/i.test(navigator.userAgent || ""));
  }

  async function plugin() {
    if (!isNativeAndroid()) return null;
    const C = window.Capacitor;
    if (C.Plugins && C.Plugins.PaliaDownloader) return C.Plugins.PaliaDownloader;
    if (typeof C.registerPlugin === "function") {
      nativePlugin = nativePlugin || C.registerPlugin("PaliaDownloader");
      return nativePlugin;
    }
    return null;
  }

  window.paliaNativeAndroid = isNativeAndroid;

  window.startPaliaApkDownload = async function (url, filename, expectedTotalBytes) {
    const p = await plugin();
    if (!p || typeof p.download !== "function") return null;
    return await p.download({
      url: String(url),
      filename: filename || "PaliaAPK-HUB-App.apk",
      expectedTotalBytes: Number(expectedTotalBytes || 0)
    });
  };

  window.listenPaliaApkDownloadProgress = async function (callback) {
    const p = await plugin();
    if (!p || typeof p.addListener !== "function") return null;
    return await p.addListener("downloadProgress", callback);
  };

  window.openPaliaApkInstaller = async function (filename) {
    const p = await plugin();
    if (!p || typeof p.openInstaller !== "function") return null;
    return await p.openInstaller({ filename: String(filename) });
  };
})();

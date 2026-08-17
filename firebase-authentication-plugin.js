/* PaliaAPK HUB - Firebase Authentication native bridge for plain HTML Capacitor app.
 * The native implementation is supplied by @capacitor-firebase/authentication.
 * This small classic-script bridge is intentionally used instead of loading the
 * package's ESM dist/plugin.js as a normal <script> tag.
 */
(function () {
  function install() {
    if (!window.Capacitor || typeof window.Capacitor.registerPlugin !== 'function') {
      console.error('[PaliaAPK HUB] Capacitor runtime is not available.');
      return;
    }
    try {
      window.FirebaseAuthentication = window.Capacitor.registerPlugin('FirebaseAuthentication');
      console.log('[PaliaAPK HUB] FirebaseAuthentication bridge registered.');
    } catch (e) {
      console.error('[PaliaAPK HUB] Failed to register FirebaseAuthentication:', e);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', install, { once: true });
  } else {
    install();
  }
})();

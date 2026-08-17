// Native Firebase Authentication bridge for the Capacitor WebView.
// Do not depend on Capacitor.Plugins being pre-populated; registerPlugin creates
// the native proxy and routes calls to the Android plugin registered by Capacitor.
(function () {
  try {
    if (window.Capacitor && typeof window.Capacitor.registerPlugin === 'function') {
      window.FirebaseAuthentication = window.Capacitor.registerPlugin('FirebaseAuthentication');
      console.log('FirebaseAuthentication native proxy registered.');
    } else {
      console.error('Capacitor registerPlugin is unavailable.');
      window.FirebaseAuthentication = null;
    }
  } catch (error) {
    console.error('FirebaseAuthentication registration failed:', error);
    window.FirebaseAuthentication = null;
  }
})();

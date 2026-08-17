// Capacitor native Firebase Authentication bridge.
(function () {
  try {
    if (!window.Capacitor || typeof window.Capacitor.registerPlugin !== 'function') {
      throw new Error('Capacitor runtime is unavailable.');
    }
    window.FirebaseAuthentication = window.Capacitor.registerPlugin('FirebaseAuthentication');
    console.log('FirebaseAuthentication native proxy ready.');
  } catch (error) {
    console.error('FirebaseAuthentication proxy setup failed:', error);
    window.FirebaseAuthentication = null;
  }
})();

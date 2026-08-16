import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shanpalia.paliaapkhub',
  appName: 'PaliaAPK HUB',
  webDir: 'www',

  server: {
    androidScheme: 'https'
  },

  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
      googleWebClientId: '270953807883-btnln51tlh1e1b2dtjfo6bsoasjhoc3s.apps.googleusercontent.com'
    }
  }
};

export default config;

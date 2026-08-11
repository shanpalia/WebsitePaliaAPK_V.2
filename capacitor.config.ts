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
      providers: ['google.com']
    }
  }
};

export default config;

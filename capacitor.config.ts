import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bitlab.ee',
  appName: 'BitLab',
  webDir: 'dist',
  // Native HTTP so the update manifest fetch is not blocked by WebView CORS.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;

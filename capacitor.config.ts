import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kasanovon.subnote',
  appName: 'SubNote',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://subnote.up.railway.app',
  },
};

export default config;

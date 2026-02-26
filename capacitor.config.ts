import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kasanovon.subnote',
  appName: 'SubNote',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;

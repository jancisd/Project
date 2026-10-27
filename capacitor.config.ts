import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ca.airstethics.app',
  appName: 'airstethics',
  webDir: 'dist',
  ios: {
    scheme: 'App',
    contentInset: 'automatic',
  },
};

export default config;

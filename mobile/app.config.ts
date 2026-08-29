import type {ExpoConfig} from 'expo/config';

const config: ExpoConfig = {
  name: 'Orena',
  slug: 'orena',
  version: '0.1.0',
  orientation: 'default',
  scheme: 'orena',
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'ios'],
  android: {
    package: 'org.chillpickle.orena',
    adaptiveIcon: {
      backgroundColor: '#102A43',
    },
  },
  ios: {
    bundleIdentifier: 'org.chillpickle.orena',
    supportsTablet: true,
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: ['expo-router', 'expo-secure-store'],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  },
};

export default config;

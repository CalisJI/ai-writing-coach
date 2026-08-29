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
    permissions: ['android.permission.RECORD_AUDIO'],
    adaptiveIcon: {
      backgroundColor: '#102A43',
    },
  },
  ios: {
    bundleIdentifier: 'org.chillpickle.orena',
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription: 'Orena uses the microphone only for temporary speaking practice.',
    },
  },
  experiments: {
    typedRoutes: true,
  },
  plugins: ['expo-router', 'expo-secure-store', ['expo-audio', {microphonePermission: 'Orena uses the microphone only for temporary speaking practice.'}]],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
    appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
  },
};

export default config;

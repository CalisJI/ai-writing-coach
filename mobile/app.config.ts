import type {ExpoConfig} from 'expo/config';

export const MOBILE_VERSION = '0.1.0';
export const MOBILE_BUILD_NUMBER = 1;
export const MOBILE_ANDROID_PACKAGE = 'org.chillpickle.orena';
export const MOBILE_IOS_BUNDLE_IDENTIFIER = 'org.chillpickle.orena';
export const MOBILE_DEEP_LINK_SCHEME = 'orena';

const config: ExpoConfig = {
  owner: 'calis-iots-team',
  name: 'Orena',
  slug: 'orena',
  version: MOBILE_VERSION,
  orientation: 'default',
  scheme: MOBILE_DEEP_LINK_SCHEME,
  userInterfaceStyle: 'automatic',
  platforms: ['android', 'ios'],
  splash: {
    backgroundColor: '#F7FAFC',
    resizeMode: 'contain',
  },
  android: {
    package: MOBILE_ANDROID_PACKAGE,
    versionCode: MOBILE_BUILD_NUMBER,
    permissions: ['android.permission.RECORD_AUDIO'],
    adaptiveIcon: {
      backgroundColor: '#102A43',
    },
  },
  ios: {
    bundleIdentifier: MOBILE_IOS_BUNDLE_IDENTIFIER,
    buildNumber: String(MOBILE_BUILD_NUMBER),
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
	eas: {
    projectId: '92edba74-095a-4838-839e-5ee7ab595f7d',
    },
  },
};

export default config;

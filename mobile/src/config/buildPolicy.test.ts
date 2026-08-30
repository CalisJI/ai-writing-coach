import appConfig, {
  MOBILE_ANDROID_PACKAGE,
  MOBILE_BUILD_NUMBER,
  MOBILE_DEEP_LINK_SCHEME,
  MOBILE_IOS_BUNDLE_IDENTIFIER,
  MOBILE_VERSION,
} from '../../app.config';
import eas from '../../eas.json';
import packageJson from '../../package.json';

describe('portable native build policy', () => {
  it('keeps one version, build number, identifier, and deep-link policy for both platforms', () => {
    expect(appConfig.version).toBe(MOBILE_VERSION);
    expect(appConfig.scheme).toBe(MOBILE_DEEP_LINK_SCHEME);
    expect(appConfig.android?.package).toBe(MOBILE_ANDROID_PACKAGE);
    expect(appConfig.android?.versionCode).toBe(MOBILE_BUILD_NUMBER);
    expect(appConfig.ios?.bundleIdentifier).toBe(MOBILE_IOS_BUNDLE_IDENTIFIER);
    expect(appConfig.ios?.buildNumber).toBe(String(MOBILE_BUILD_NUMBER));
    expect(appConfig.platforms).toEqual(['android', 'ios']);
    expect(appConfig.plugins).toEqual(expect.arrayContaining(['expo-router', 'expo-secure-store']));
  });

  it('keeps native metadata and all secret-free EAS profiles reproducible', () => {
    expect(appConfig.splash?.backgroundColor).toBe('#F7FAFC');
    expect(appConfig.android?.adaptiveIcon?.backgroundColor).toBe('#102A43');
    expect(appConfig.android?.permissions).toContain('android.permission.RECORD_AUDIO');
    expect(appConfig.ios?.infoPlist?.NSMicrophoneUsageDescription).toContain('temporary speaking practice');
    expect(eas.cli.appVersionSource).toBe('local');
    expect(eas.build.development).toMatchObject({developmentClient: true, distribution: 'internal', channel: 'development'});
    expect(eas.build.preview).toMatchObject({distribution: 'internal', channel: 'preview', android: {buildType: 'apk'}});
    expect(eas.build.production).toMatchObject({autoIncrement: true, channel: 'production', android: {buildType: 'app-bundle'}});
    expect(packageJson.scripts).toMatchObject({lint: expect.any(String), typecheck: expect.any(String), test: expect.any(String), 'validate:config': expect.any(String), validate: expect.any(String)});
    expect(packageJson.scripts['validate:prebuild']).toBe('node scripts/validate-prebuild.mjs');
    expect(JSON.stringify(appConfig)).not.toMatch(/(secret|token|password|privateKey|clientSecret)/i);
    expect(JSON.stringify(eas)).not.toMatch(/(secret|token|password|privateKey|serviceAccount)/i);
  });
});

import config from '../../app.config';

describe('native media configuration', () => {
  it('declares microphone capability without adding private credentials', () => {
    expect(config.android?.permissions).toContain('android.permission.RECORD_AUDIO');
    expect(config.ios?.infoPlist?.NSMicrophoneUsageDescription).toEqual(
      'Orena uses the microphone only for temporary speaking practice.',
    );
    expect(config.plugins).toEqual(expect.arrayContaining([
      expect.arrayContaining(['expo-audio', expect.objectContaining({microphonePermission: expect.any(String)})]),
    ]));
    expect(JSON.stringify(config)).not.toMatch(/(apiKey|secret|token|authorization)/i);
  });
});

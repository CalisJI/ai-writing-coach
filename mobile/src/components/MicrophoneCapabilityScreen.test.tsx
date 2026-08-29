import React from 'react';
import renderer from 'react-test-renderer';
import {Text} from 'react-native';
import {I18nProvider} from '../i18n/I18nProvider';
import {ThemeProvider} from '../theme/ThemeProvider';
import {MicrophoneCapabilityScreen} from './MicrophoneCapabilityScreen';
import {TransientAudioService, type AudioAdapter} from '../media/transientAudioService';

jest.mock('expo-audio', () => ({
  AudioModule: {AudioRecorder: class {}},
  AudioPlayer: class {},
  AudioRecorder: class {},
  PLAYBACK_STATUS_UPDATE: 'playbackStatusUpdate',
  RECORDING_STATUS_UPDATE: 'recordingStatusUpdate',
  RecordingPresets: {LOW_QUALITY: {format: 'temporary'}},
  createAudioPlayer: jest.fn(),
  getRecordingPermissionsAsync: jest.fn(),
  requestRecordingPermissionsAsync: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));
jest.mock('../media/useTransientAudioLifecycle', () => ({useTransientAudioLifecycle: jest.fn()}));

function service(): TransientAudioService {
  const adapter: AudioAdapter = {
    getPermissionsAsync: jest.fn().mockResolvedValue({granted: false, status: 'denied', canAskAgain: true}),
    requestPermissionsAsync: jest.fn().mockResolvedValue({granted: false, status: 'denied', canAskAgain: true}),
    setAudioModeAsync: jest.fn(),
    createRecording: jest.fn(),
    createSound: jest.fn(),
  };
  return new TransientAudioService(adapter);
}

describe('microphone capability UI', () => {
  it.each([
    ['en', 'Microphone practice setup', 'Allow microphone and record'],
    ['zh', '麦克风练习设置', '允许麦克风并录音'],
  ] as const)('renders accessible %s controls', (locale, title, action) => {
    const tree = renderer.create(<ThemeProvider><I18nProvider initialLocale={locale}><MicrophoneCapabilityScreen service={service()} /></I18nProvider></ThemeProvider>);
    expect(tree.root.findAllByType(Text).some((node) => node.props.children === title)).toBe(true);
    expect(tree.root.findByProps({accessibilityLabel: action})).toBeDefined();
  });
});

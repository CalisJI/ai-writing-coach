import {TransientAudioService, type AudioAdapter} from './transientAudioService';

jest.mock('expo-audio', () => ({
  AudioModule: {AudioRecorder: class {}},
  PLAYBACK_STATUS_UPDATE: 'playbackStatusUpdate',
  RECORDING_STATUS_UPDATE: 'recordingStatusUpdate',
  RecordingPresets: {LOW_QUALITY: {format: 'temporary'}},
  createAudioPlayer: jest.fn(),
  getRecordingPermissionsAsync: jest.fn(),
  requestRecordingPermissionsAsync: jest.fn(),
  setAudioModeAsync: jest.fn(),
}));
jest.mock('expo-file-system', () => ({deleteAsync: jest.fn()}));

function adapter(overrides: Partial<AudioAdapter> = {}): AudioAdapter {
  return {
    getPermissionsAsync: jest.fn().mockResolvedValue({granted: true, status: 'granted'}),
    requestPermissionsAsync: jest.fn(),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    createRecording: jest.fn().mockReturnValue({
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue('file:///cache/orena-transient.m4a'),
    }),
    createSound: jest.fn().mockResolvedValue({playAsync: jest.fn().mockResolvedValue(undefined), unloadAsync: jest.fn().mockResolvedValue(undefined)}),
    ...overrides,
  };
}

describe('transient native audio boundary', () => {
  it.each([
    [{granted: false, status: 'denied', canAskAgain: true}, {granted: false, status: 'denied', canAskAgain: true}, 'denied'],
    [{granted: false, status: 'denied', canAskAgain: false}, null, 'restricted'],
    [{granted: false, status: 'unavailable'}, null, 'unavailable'],
  ] as const)('models %s permission without starting capture', async (current, requested, expected) => {
    const local = adapter({
      getPermissionsAsync: jest.fn().mockResolvedValue(current),
      requestPermissionsAsync: jest.fn().mockResolvedValue(requested),
    });
    const service = new TransientAudioService(local);
    await expect(service.requestPermission()).resolves.toBe(expected);
    expect(local.createRecording).not.toHaveBeenCalled();
  });

  it('records, plays, and deletes only transient audio resources', async () => {
    const local = adapter();
    const service = new TransientAudioService(local);
    await expect(service.startRecording()).resolves.toMatchObject({state: 'recording', permission: 'granted'});
    expect(local.setAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({allowsRecording: true}));
    await expect(service.stopRecording()).resolves.toMatchObject({state: 'recorded'});
    await expect(service.play()).resolves.toMatchObject({state: 'playing'});
    const sound = await (local.createSound as jest.Mock).mock.results[0]!.value;
    expect(sound.playAsync).toHaveBeenCalledTimes(1);
    await service.cancel();
    expect(sound.unloadAsync).toHaveBeenCalledTimes(1);
    const {deleteAsync} = jest.requireMock('expo-file-system') as {deleteAsync: jest.Mock};
    expect(deleteAsync).toHaveBeenCalledWith('file:///cache/orena-transient.m4a', {idempotent: true});
  });

  it('releases the previous take before starting another recording', async () => {
    const firstRecording = {
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue('file:///cache/first.m4a'),
    };
    const secondRecording = {
      prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
      startAsync: jest.fn().mockResolvedValue(undefined),
      stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
      getURI: jest.fn().mockReturnValue('file:///cache/second.m4a'),
    };
    const local = adapter({createRecording: jest.fn()
      .mockReturnValueOnce(firstRecording)
      .mockReturnValueOnce(secondRecording)});
    const service = new TransientAudioService(local);
    await service.startRecording();
    await service.stopRecording();
    await service.play();
    const firstSound = await (local.createSound as jest.Mock).mock.results[0]!.value;
    await service.startRecording();
    expect(firstSound.unloadAsync).toHaveBeenCalledTimes(1);
    expect((jest.requireMock('expo-file-system') as {deleteAsync: jest.Mock}).deleteAsync)
      .toHaveBeenCalledWith('file:///cache/first.m4a', {idempotent: true});
    expect(local.createRecording).toHaveBeenCalledTimes(2);
  });

  it('stops and releases recording when suspended or interrupted by a failure', async () => {
    const local = adapter({
      createRecording: jest.fn().mockReturnValue({
        prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
        startAsync: jest.fn().mockRejectedValue(new Error('interrupted')),
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue('file:///cache/failed.m4a'),
      }),
    });
    const service = new TransientAudioService(local);
    await expect(service.startRecording()).resolves.toMatchObject({state: 'failed'});
    expect((local.createRecording as jest.Mock).mock.results[0]!.value.stopAndUnloadAsync).toHaveBeenCalled();

    let statusListener: ((status: {isRecording?: boolean; isDoneRecording?: boolean}) => void) | undefined;
    const interruptedAdapter = adapter({
      createRecording: jest.fn().mockReturnValue({
        prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
        startAsync: jest.fn().mockResolvedValue(undefined),
        stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
        getURI: jest.fn().mockReturnValue('file:///cache/interrupted.m4a'),
        setOnRecordingStatusUpdate: (listener: (status: {isRecording?: boolean; isDoneRecording?: boolean}) => void) => { statusListener = listener; },
      }),
    });
    const interrupted = new TransientAudioService(interruptedAdapter);
    await interrupted.startRecording();
    statusListener?.({isRecording: false, isDoneRecording: false});
    expect(interrupted.getSnapshot().state).toBe('interrupted');
    await Promise.resolve();
    expect((interruptedAdapter.createRecording as jest.Mock).mock.results[0]!.value.stopAndUnloadAsync).toHaveBeenCalled();
    await interrupted.suspend();
    expect(interrupted.getSnapshot().state).toBe('suspended');
  });
});

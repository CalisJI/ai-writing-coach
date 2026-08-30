import {
  AudioModule,
  RecordingPresets,
  createAudioPlayer,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import type {AudioRecorder as ExpoAudioRecorder} from 'expo-audio';
import * as FileSystem from 'expo-file-system';

export type MicrophonePermission = 'granted' | 'denied' | 'restricted' | 'unavailable';
export type TransientAudioState =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'recorded'
  | 'playing'
  | 'denied'
  | 'restricted'
  | 'unavailable'
  | 'interrupted'
  | 'failed'
  | 'suspended';

export type PermissionResponseLike = {granted?: boolean; status?: string; canAskAgain?: boolean};
export type RecordingHandle = {
  prepareToRecordAsync: (options?: unknown) => Promise<unknown>;
  startAsync: () => Promise<unknown>;
  stopAndUnloadAsync: () => Promise<unknown>;
  getURI: () => string | null;
  setOnRecordingStatusUpdate?: (listener: (status: {isRecording?: boolean; isDoneRecording?: boolean}) => void) => void;
  release?: () => void;
};
export type SoundHandle = {playAsync: () => Promise<unknown>; unloadAsync: () => Promise<unknown>};

export type AudioAdapter = {
  getPermissionsAsync: () => Promise<PermissionResponseLike>;
  requestPermissionsAsync: () => Promise<PermissionResponseLike>;
  setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
  createRecording: () => RecordingHandle;
  createSound: (uri: string, onFinished: () => void) => Promise<SoundHandle>;
};

export type TransientAudioSnapshot = {state: TransientAudioState; permission: MicrophonePermission | null};

const recordingOptions = RecordingPresets.LOW_QUALITY!;
type AudioModuleWithRecorder = typeof AudioModule & {
  AudioRecorder: new (options: typeof recordingOptions) => ExpoAudioRecorder;
};
const defaultAdapter: AudioAdapter = {
  getPermissionsAsync: getRecordingPermissionsAsync,
  requestPermissionsAsync: requestRecordingPermissionsAsync,
  setAudioModeAsync,
  createRecording: () => {
    const Recorder = (AudioModule as AudioModuleWithRecorder).AudioRecorder;
    const recording = new Recorder(recordingOptions);
    let uri: string | null = null;
    let subscription: {remove: () => void} | null = null;
    return {
      prepareToRecordAsync: (options) => recording.prepareToRecordAsync(options as Partial<typeof recordingOptions>),
      startAsync: async () => recording.record(),
      stopAndUnloadAsync: async () => {
        await recording.stop();
        uri = recording.uri;
        subscription?.remove();
        subscription = null;
      },
      getURI: () => uri ?? recording.uri,
      setOnRecordingStatusUpdate: (listener) => {
        subscription = recording.addListener('recordingStatusUpdate', (status) => listener({
          isRecording: !status.isFinished,
          isDoneRecording: status.isFinished,
        }));
      },
      release: () => {
        subscription?.remove();
        subscription = null;
        recording.release();
      },
    };
  },
  createSound: async (uri, onFinished) => {
    const player = createAudioPlayer({uri});
    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) onFinished();
    });
    return {
      playAsync: async () => player.play(),
      unloadAsync: async () => {
        subscription.remove();
        player.release();
      },
    };
  },
};

function permissionFrom(response: PermissionResponseLike): MicrophonePermission {
  if (response.granted === true || response.status === 'granted') return 'granted';
  if (response.status === 'restricted' || response.canAskAgain === false) return 'restricted';
  if (response.status === 'unavailable') return 'unavailable';
  return 'denied';
}

export class TransientAudioService {
  private snapshot: TransientAudioSnapshot = {state: 'idle', permission: null};
  private recording: RecordingHandle | null = null;
  private sound: SoundHandle | null = null;
  private uri: string | null = null;
  private listeners = new Set<(snapshot: TransientAudioSnapshot) => void>();

  constructor(private readonly adapter: AudioAdapter = defaultAdapter) {}

  getSnapshot(): TransientAudioSnapshot {
    return this.snapshot;
  }

  subscribe(listener: (snapshot: TransientAudioSnapshot) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async requestPermission(): Promise<MicrophonePermission> {
    this.setState('requesting', null);
    try {
      const current = permissionFrom(await this.adapter.getPermissionsAsync());
      const permission = current === 'denied' ? permissionFrom(await this.adapter.requestPermissionsAsync()) : current;
      this.setState(permission === 'granted' ? 'idle' : permission, permission);
      return permission;
    } catch {
      this.setState('unavailable', 'unavailable');
      return 'unavailable';
    }
  }

  async startRecording(): Promise<TransientAudioSnapshot> {
    await this.releaseRecording();
    await this.releasePlayback();
    await this.deleteTransientUri();
    const permission = await this.requestPermission();
    if (permission !== 'granted') return this.snapshot;
    try {
      await this.adapter.setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'doNotMix',
        shouldRouteThroughEarpiece: false,
      });
      this.recording = this.adapter.createRecording();
      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();
      this.recording.setOnRecordingStatusUpdate?.((status) => {
        if (this.snapshot.state === 'recording' && status.isRecording === false && status.isDoneRecording !== true) {
          this.setState('interrupted', permission);
          void this.releaseRecording().then(() => this.deleteTransientUri());
        }
      });
      this.setState('recording', permission);
    } catch {
      await this.releaseRecording();
      await this.deleteTransientUri();
      this.setState('failed', permission);
    }
    return this.snapshot;
  }

  async stopRecording(): Promise<TransientAudioSnapshot> {
    if (!this.recording) return this.snapshot;
    try {
      await this.recording.stopAndUnloadAsync();
      await this.adapter.setAudioModeAsync({allowsRecording: false, shouldPlayInBackground: false});
      this.uri = this.recording.getURI();
      this.recording.release?.();
      this.recording = null;
      if (!this.uri) throw new Error('Recording produced no transient URI');
      this.setState('recorded', this.snapshot.permission);
    } catch {
      await this.releaseRecording();
      await this.deleteTransientUri();
      this.setState('failed', this.snapshot.permission);
    }
    return this.snapshot;
  }

  async play(): Promise<TransientAudioSnapshot> {
    if (!this.uri) return this.snapshot;
    try {
      const uri = this.uri;
      this.sound = await this.adapter.createSound(uri, () => { void this.releasePlayback(); });
      await this.sound.playAsync();
      this.setState('playing', this.snapshot.permission);
    } catch {
      await this.releasePlayback();
      this.setState('failed', this.snapshot.permission);
    }
    return this.snapshot;
  }

  async cancel(): Promise<void> {
    await this.releaseRecording();
    await this.releasePlayback();
    await this.deleteTransientUri();
    this.setState('idle', this.snapshot.permission);
  }

  async suspend(): Promise<void> {
    await this.releaseRecording();
    await this.releasePlayback();
    await this.deleteTransientUri();
    this.setState('suspended', this.snapshot.permission);
  }

  async release(): Promise<void> {
    await this.cancel();
  }

  private async releaseRecording(): Promise<void> {
    if (!this.recording) return;
    try { await this.recording.stopAndUnloadAsync(); } catch { /* already interrupted/unloaded */ }
    this.uri = this.recording.getURI();
    this.recording.release?.();
    this.recording = null;
  }

  private async releasePlayback(): Promise<void> {
    if (!this.sound) return;
    try { await this.sound.unloadAsync(); } catch { /* already unloaded */ }
    this.sound = null;
    await this.deleteTransientUri();
    this.setState('idle', this.snapshot.permission);
  }

  private async deleteTransientUri(): Promise<void> {
    const uri = this.uri;
    this.uri = null;
    if (uri) {
      try { await FileSystem.deleteAsync(uri, {idempotent: true}); } catch { /* cache cleanup is best effort */ }
    }
  }

  private setState(state: TransientAudioState, permission: MicrophonePermission | null): void {
    this.snapshot = {state, permission};
    for (const listener of this.listeners) listener(this.snapshot);
  }
}

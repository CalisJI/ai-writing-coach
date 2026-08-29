import {useEffect} from 'react';
import {AppState} from 'react-native';
import type {TransientAudioService} from './transientAudioService';

export function useTransientAudioLifecycle(service: TransientAudioService): void {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void service.suspend();
    });
    return () => {
      subscription.remove();
      void service.release();
    };
  }, [service]);
}

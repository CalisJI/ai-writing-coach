import {useEffect, useMemo, useState} from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {StyleSheet, Text, View} from 'react-native';
import {AccessibleButton} from './AccessibleButton';
import {useI18n} from '../i18n/I18nProvider';
import {useTheme} from '../theme/ThemeProvider';
import {useTransientAudioLifecycle} from '../media/useTransientAudioLifecycle';
import {TransientAudioService, type TransientAudioSnapshot} from '../media/transientAudioService';

export function MicrophoneCapabilityScreen({service: suppliedService}: {service?: TransientAudioService}) {
  const service = useMemo(() => suppliedService ?? new TransientAudioService(), [suppliedService]);
  const [snapshot, setSnapshot] = useState<TransientAudioSnapshot>(service.getSnapshot());
  const {t} = useI18n();
  const {tokens} = useTheme();
  useTransientAudioLifecycle(service);
  useEffect(() => service.subscribe(setSnapshot), [service]);

  const stateMessage: Record<TransientAudioSnapshot['state'], string> = {
    idle: t('media.ready'), requesting: t('media.permission_requesting'), recording: t('media.recording'),
    recorded: t('media.recorded'), playing: t('media.playing'), denied: t('media.permission_denied'),
    restricted: t('media.permission_restricted'), unavailable: t('media.unavailable'), interrupted: t('media.interrupted'),
    failed: t('media.failed'), suspended: t('media.suspended'),
  };
  const recording = snapshot.state === 'recording';
  const canPlay = snapshot.state === 'recorded';
  return <SafeAreaView style={[styles.container, {backgroundColor: tokens.colors.background}]}>
    <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.text}]}>{t('media.title')}</Text>
    <Text style={[styles.body, {color: tokens.colors.mutedText}]}>{stateMessage[snapshot.state]}</Text>
    <View style={styles.actions}>
      {recording ? <AccessibleButton label={t('media.stop')} onPress={() => { void service.stopRecording(); }} /> :
        <AccessibleButton label={t('media.start')} onPress={() => { void service.startRecording(); }} />}
      {canPlay && <AccessibleButton label={t('media.play')} onPress={() => { void service.play(); }} />}
      {(recording || canPlay || snapshot.state === 'playing') && <AccessibleButton label={t('media.cancel')} onPress={() => { void service.cancel(); }} />}
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({container: {flex: 1, padding: 24, gap: 16}, title: {fontSize: 28, fontWeight: '700'}, body: {fontSize: 16, lineHeight: 24}, actions: {gap: 12}});

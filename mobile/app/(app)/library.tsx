import {useMemo, useState} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useLibraryVocabulary, useReviewLibraryVocabulary} from '../../src/query/useReadingLibrary';
import {Button, Chip, Panel, PanelCopy} from '../../src/components/orena';

/**
 * Ported from static/becoming/screens/library.js and orena/library.css.
 *
 * A saved word stays private until revealed, then offers Again/Got it to
 * record a spaced-recall attempt -- unchanged from the prior implementation,
 * restyled onto the Orena panel/chip/button primitives.
 */
export default function LibraryScreen() {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const client = useMemo(() => {
    try { return createConfiguredApiClient(); } catch { return null; }
  }, []);
  const library = useLibraryVocabulary(client, sessionCookie);
  const review = useReviewLibraryVocabulary(client, sessionCookie);
  const [notice, setNotice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  // Not signed in is a different fact from the service being unavailable.
  const signedOut = !sessionCookie;
  const unavailable = !signedOut && (!client || library.isError);
  const dueCount = library.data?.items.filter((item) => item.due).length ?? 0;
  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <View style={styles.headRow}>
        <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('library.title')}</Text>
        {!unavailable && !signedOut && !library.isLoading && dueCount > 0 ? <Chip>{dueCount} {t('library.due_count')}</Chip> : null}
      </View>
      {library.isLoading && <Text style={{color: tokens.colors.mutedText}}>{t('library.loading')}</Text>}
      {signedOut && <PanelCopy>{t('library.signed_out' as never)}</PanelCopy>}
      {unavailable && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('library.unavailable')}</Text>}
      {!unavailable && !signedOut && !library.isLoading && library.data?.items.length === 0 && <PanelCopy>{t('library.empty')}</PanelCopy>}
      {!unavailable && !signedOut && library.data?.items.map((item) => (
        <Panel key={item.word + item.added_at}>
          <View style={styles.wordRow}>
            <Text style={[styles.word, {color: tokens.colors.heading}]}>{item.word}</Text>
            {item.due ? <Chip>{item.stage_label}</Chip> : <Text style={{color: tokens.colors.mutedText}}>{item.stage_label}</Text>}
          </View>
          {(!item.due || revealed.has(item.word)) ? (
            <>
              <Text style={{color: tokens.colors.text}}>{item.definition}</Text>
              {item.translation_vi && <Text style={{color: tokens.colors.mutedText}}>{item.translation_vi}</Text>}
            </>
          ) : (
            <Button label={t('library.reveal')} variant="outline" compact onPress={() => setRevealed((current) => { const next = new Set(current); next.add(item.word); return next; })} />
          )}
          {item.due && revealed.has(item.word) && (
            <View style={styles.actions}>
              <View style={styles.actionSlot}><Button label={t('library.again')} variant="outline" disabled={review.isPending} onPress={() => review.mutate({word: item.word, result: 'again'}, {onSuccess: (result) => { if (result.found === false) setNotice(t('library.review_failed')); }})} /></View>
              <View style={styles.actionSlot}><Button label={t('library.got_it')} disabled={review.isPending} onPress={() => review.mutate({word: item.word, result: 'got_it'}, {onSuccess: (result) => { if (result.found === false) setNotice(t('library.review_failed')); }})} /></View>
            </View>
          )}
        </Panel>
      ))}
      {notice && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text>}
      {review.isError && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('library.review_failed')}</Text>}
      <Button label={t('library.open_reading')} onPress={() => router.replace('/(app)/reading')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 16, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  headRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  title: {fontSize: 20, fontWeight: '700'},
  wordRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  word: {fontSize: 17, fontWeight: '700'},
  actions: {flexDirection: 'row', gap: 8},
  actionSlot: {flex: 1},
});

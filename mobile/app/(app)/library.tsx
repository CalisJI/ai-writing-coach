import {useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useLibraryVocabulary, useReviewLibraryVocabulary} from '../../src/query/useReadingLibrary';

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
  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('library.title')}</Text>
      {library.isLoading && <Text style={{color: tokens.colors.mutedText}}>{t('library.loading')}</Text>}
      {signedOut && <Text style={{color: tokens.colors.mutedText}}>{t('library.signed_out' as never)}</Text>}
      {unavailable && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('library.unavailable')}</Text>}
      {!unavailable && !signedOut && !library.isLoading && library.data?.items.length === 0 && <Text style={{color: tokens.colors.mutedText}}>{t('library.empty')}</Text>}
      {!unavailable && !signedOut && !library.isLoading && library.data && library.data.items.filter((item) => item.due).length > 0 && <Text style={{color: tokens.colors.mutedText}}>{library.data.items.filter((item) => item.due).length} {t('library.due_count')}</Text>}
      {!unavailable && !signedOut && library.data?.items.map((item) => (
        <View key={item.word + item.added_at} style={[styles.card, {backgroundColor: tokens.colors.surface, borderColor: tokens.colors.border}]}>
          <Text style={[styles.word, {color: tokens.colors.text}]}>{item.word}</Text>
          {(!item.due || revealed.has(item.word)) ? <><Text style={{color: tokens.colors.text}}>{item.definition}</Text>{item.translation_vi && <Text style={{color: tokens.colors.mutedText}}>{item.translation_vi}</Text>}</> : <Pressable accessibilityRole="button" onPress={() => setRevealed((current) => { const next = new Set(current); next.add(item.word); return next; })} style={[styles.smallButton, {borderColor: tokens.colors.accent}]}><Text style={{color: tokens.colors.accent}}>{t('library.reveal')}</Text></Pressable>}
          <Text style={{color: tokens.colors.mutedText}}>{item.stage_label}</Text>
          {item.due && revealed.has(item.word) && <View style={styles.actions}><Pressable accessibilityRole="button" disabled={review.isPending} onPress={() => review.mutate({word: item.word, result: 'again'}, {onSuccess: (result) => { if (result.found === false) setNotice(t('library.review_failed')); }})} style={[styles.smallButton, {borderColor: tokens.colors.accent}]}><Text style={{color: tokens.colors.accent}}>{t('library.again')}</Text></Pressable><Pressable accessibilityRole="button" disabled={review.isPending} onPress={() => review.mutate({word: item.word, result: 'got_it'}, {onSuccess: (result) => { if (result.found === false) setNotice(t('library.review_failed')); }})} style={[styles.smallButton, {backgroundColor: tokens.colors.accent}]}><Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('library.got_it')}</Text></Pressable></View>}
        </View>
      ))}
      {notice && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text>}
      {review.isError && <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('library.review_failed')}</Text>}
      <Pressable accessibilityRole="button" onPress={() => router.replace('/(app)/reading')} style={[styles.button, {backgroundColor: tokens.colors.accent}]}>
        <Text style={[styles.buttonText, {color: tokens.colors.onAccent}]}>{t('library.open_reading')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 24, gap: 12, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  title: {fontSize: 20, fontWeight: '700'},
  card: {padding: 16, borderRadius: 20, gap: 6, borderWidth: 1},
  word: {fontSize: 17, fontWeight: '700'},
  button: {padding: 16, borderRadius: 15, alignItems: 'center', minHeight: 44, justifyContent: 'center'},
  buttonText: {fontSize: 14, fontWeight: '700'},
  actions: {flexDirection: 'row', gap: 8},
  smallButton: {flex: 1, padding: 12, borderRadius: 15, borderWidth: 1, alignItems: 'center'},
});

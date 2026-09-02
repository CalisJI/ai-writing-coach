import {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useRouter} from 'expo-router';
import {createConfiguredApiClient} from '../../src/api/client';
import {useSession} from '../../src/auth/SessionHarness';
import {useI18n} from '../../src/i18n/I18nProvider';
import {useTheme} from '../../src/theme/ThemeProvider';
import {CONTENT_MAX} from '../../src/theme/layout';
import {useLibraryVocabulary, useReviewLibraryVocabulary} from '../../src/query/useReadingLibrary';
import {useLearnerProfile} from '../../src/query/useLearnerProfile';
import {readLibraryGoal, writeLibraryGoal} from '../../src/features/library/libraryGoal';
import {
  focusAreas, libraryCounts, masteryStage, masteryTone, pageOf, recallAccuracy, relativeTone,
  reviewedToday, typeTabs, visibleItems, countsByType, itemType,
  type LibraryFilter, type LibraryItem, type LibrarySort,
} from '../../src/features/library/libraryDomain';
import {Button, Card, Chip, Label, Panel, PanelCopy} from '../../src/components/orena';
import {ErrorState, LoadingState, SignedOutState} from '../../src/components/states';
import {OrenaIcon} from '../../src/components/OrenaIcon';

/**
 * Ported from static/becoming/screens/library.js and orena/library.css.
 *
 * Active Recall is a queue and a workbench, not a list of cards. The reference
 * gives it a recall head with the due count, category tabs, a filter and a sort,
 * a paged table of everything saved, and a rail that reports the queue split,
 * the daily goal, recall accuracy and where the work is. Native had a flat list
 * of panels with reveal / Again / Got it, which is the recall step alone.
 *
 * At the phone breakpoint the rail stacks under the table, the two selects share
 * a row with the add action beneath them, and the table keeps its own horizontal
 * scroll -- `.o-lib-table{min-width:640px}`, because six columns will not fit a
 * phone and the reference scrolls them rather than dropping any.
 *
 * Nothing here claims mastery: `review_stage` is a spaced-repetition position
 * and the screen says so, and accuracy is scoped to recorded recalls.
 */

const FILTERS: LibraryFilter[] = ['all', 'due', 'soon', 'new'];
const SORTS: LibrarySort[] = ['next', 'added', 'alpha', 'mastery'];

/** `.o-lib-tab`: a category with its count; an empty one still says it exists. */
function TypeTab({label, count, active, onPress}: {label: string; count: number; active: boolean; onPress: () => void}) {
  const {tokens} = useTheme();
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityState={{selected: active}}
      onPress={onPress}
      style={[styles.tab, {
        borderColor: active ? tokens.colors.accent : tokens.colors.border,
        backgroundColor: active ? tokens.colors.accentTint : tokens.colors.surface,
        opacity: count ? 1 : 0.55,
      }]}
    >
      <Text style={[styles.tabLabel, {color: active ? tokens.colors.accent : tokens.colors.text}]}>{label}</Text>
      <Text style={[styles.tabCount, {color: tokens.colors.mutedText}]}>{count}</Text>
    </Pressable>
  );
}

/** A select, as the cycling control a phone can actually use. */
function CycleSelect({label, value, onPress}: {label: string; value: string; onPress: () => void}) {
  const {tokens} = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.select, {borderColor: tokens.colors.border, backgroundColor: tokens.colors.surface}]}>
      <Text style={[styles.selectLabel, {color: tokens.colors.faintText}]}>{label}</Text>
      <Text style={[styles.selectValue, {color: tokens.colors.text}]} numberOfLines={1}>{value}</Text>
    </Pressable>
  );
}

/** `masteryCell()`: five dots, one per review stage, plus the stage's own name. */
function Mastery({item}: {item: LibraryItem}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  const stage = masteryStage(item);
  const tone = masteryTone(stage);
  const colour = tone === 'strong' ? tokens.colors.positive : tone === 'good' ? tokens.colors.roleAdjective : tone === 'reviewing' ? tokens.colors.attention : tokens.colors.faintText;
  return (
    <View style={styles.mastery}>
      <View style={styles.masteryDots}>
        {Array.from({length: 5}, (_, index) => (
          <View key={index} style={[styles.masteryDot, {backgroundColor: index <= stage ? colour : tokens.colors.border}]} />
        ))}
      </View>
      <Text style={[styles.cellMuted, {color: tokens.colors.mutedText}]}>{item.stage_label || t('lib.col_mastery')}</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const {t, locale} = useI18n();
  const {tokens} = useTheme();
  const {sessionCookie} = useSession();
  const router = useRouter();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const library = useLibraryVocabulary(client, sessionCookie);
  const review = useReviewLibraryVocabulary(client, sessionCookie);
  const profile = useLearnerProfile(client, sessionCookie);
  const language = profile.data?.language ?? locale;

  const [notice, setNotice] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const [showRecall, setShowRecall] = useState(false);
  const [tab, setTab] = useState('all');
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [sort, setSort] = useState<LibrarySort>('next');
  const [page, setPage] = useState(1);
  const [goal, setGoal] = useState(10);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState('');

  const refreshGoal = useCallback(() => { void readLibraryGoal().then(setGoal); }, []);
  useEffect(() => { refreshGoal(); }, [refreshGoal]);

  const signedOut = !sessionCookie;
  const unavailable = !signedOut && (!client || library.isError);
  const items = useMemo<LibraryItem[]>(() => (library.data?.items ?? []) as LibraryItem[], [library.data]);

  const counts = libraryCounts(items);
  const byType = countsByType(items, language);
  const tabs = typeTabs(items, language);
  const rows = visibleItems(items, {tab, filter, sort}, language);
  const paged = pageOf(rows, page);
  const {accuracy, recalls, lapses} = recallAccuracy(items);
  const doneToday = items.filter((item) => reviewedToday(item)).length;
  const areas = focusAreas(items, t('lib.no_definition'));
  const due = items.find((item) => item.due) ?? null;

  const recordReview = (word: string, result: 'again' | 'got_it') => {
    review.mutate({word, result}, {onSuccess: (outcome) => { if (outcome.found === false) setNotice(t('library.review_failed')); }});
  };
  const relativeText = (item: LibraryItem) => {
    const {tone, days} = relativeTone(item);
    if (tone === 'none') return t('lib.not_scheduled');
    if (tone === 'due') return t('lib.due_now');
    if (days === 1) return t('lib.tomorrow');
    return t('lib.in_days').replace('{n}', String(days));
  };
  const typeName = (key: string) => t(`lib.type_${key}` as never) || key;

  if (signedOut || unavailable || library.isLoading) {
    return (
      <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
        <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('library.title')}</Text>
        {library.isLoading && !signedOut && !unavailable ? <LoadingState lines={5} /> : null}
        {signedOut ? <SignedOutState message={t('library.signed_out' as never)} /> : null}
        {unavailable ? <ErrorState message={t('library.unavailable')} /> : null}
        <Button label={t('library.open_reading')} onPress={() => router.replace('/(app)/reading')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{flex: 1, backgroundColor: tokens.colors.background}} contentContainerStyle={[styles.container, {backgroundColor: tokens.colors.background}]}>
      {/* `.o-recall-head` */}
      <Card style={styles.recallHead}>
        <View style={styles.recallIdentity}>
          <View style={[styles.recallIcon, {borderColor: tokens.depth.badgeEdge, backgroundColor: tokens.colors.surface}]}>
            <OrenaIcon name="library" size={20} color={tokens.colors.accent} />
          </View>
          <View style={styles.recallCopy}>
            <Text accessibilityRole="header" style={[styles.title, {color: tokens.colors.heading}]}>{t('library.title')}</Text>
            <PanelCopy>{t('lib.lead')}</PanelCopy>
          </View>
        </View>
        <View style={styles.recallFoot}>
          <View style={styles.recallCount}>
            <Text style={[styles.recallCountValue, {color: tokens.colors.accent}]}>{counts.due}</Text>
            <Text style={[styles.cellMuted, {color: tokens.colors.mutedText}]}>{t('lib.items_due')}</Text>
          </View>
          <Button label={t('lib.review_now')} disabled={counts.due === 0} onPress={() => setShowRecall(true)} />
        </View>
      </Card>

      {/* The recall card: private until revealed, then Again / Got it. */}
      {showRecall && due ? (
        <Panel>
          <View style={styles.wordRow}>
            <Text style={[styles.word, {color: tokens.colors.heading}]}>{due.word}</Text>
            <Chip>{due.stage_label}</Chip>
          </View>
          {revealed.has(due.word) ? (
            <>
              <Text style={{color: tokens.colors.text}}>{due.definition}</Text>
              {due.translation_vi ? <Text style={{color: tokens.colors.mutedText}}>{due.translation_vi}</Text> : null}
              <View style={styles.actions}>
                <View style={styles.actionSlot}><Button label={t('library.again')} variant="outline" disabled={review.isPending} onPress={() => recordReview(due.word, 'again')} /></View>
                <View style={styles.actionSlot}><Button label={t('library.got_it')} disabled={review.isPending} onPress={() => recordReview(due.word, 'got_it')} /></View>
              </View>
            </>
          ) : (
            <Button label={t('library.reveal')} variant="outline" onPress={() => setRevealed((current) => new Set(current).add(due.word))} />
          )}
        </Panel>
      ) : null}

      {/* `.o-lib-toolbar`: the tabs scroll, then the two selects share a row. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <TypeTab label={t('lib.all')} count={counts.all} active={tab === 'all'} onPress={() => { setTab('all'); setPage(1); }} />
        {tabs.map((key) => (
          <TypeTab key={key} label={typeName(key)} count={byType[key] ?? 0} active={tab === key} onPress={() => { setTab(key); setPage(1); }} />
        ))}
      </ScrollView>
      <View style={styles.tools}>
        <View style={styles.toolCell}>
          <CycleSelect
            label={t('lib.filters')} value={t(`lib.filter_${filter}` as never)}
            onPress={() => { setFilter(FILTERS[(FILTERS.indexOf(filter) + 1) % FILTERS.length]!); setPage(1); }}
          />
        </View>
        <View style={styles.toolCell}>
          <CycleSelect
            label={t('lib.sort')} value={t(`lib.sort_${sort}` as never)}
            onPress={() => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]!)}
          />
        </View>
      </View>

      {/* `.o-lib-table-card`: six columns will not fit a phone, so the reference
          scrolls them rather than dropping any. */}
      <Card style={styles.tableCard}>
        {paged.slice.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.strong, {color: tokens.colors.text}]}>{tab === 'all' ? t('library.empty') : t('lib.category_empty')}</Text>
            {tab === 'all' ? <PanelCopy>{t('library.empty_desc' as never)}</PanelCopy> : null}
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.tableScroll}>
            <View style={styles.table}>
              <View style={[styles.tableHead, {borderBottomColor: tokens.colors.border}]}>
                <Text style={[styles.colItem, styles.headCell, {color: tokens.colors.faintText}]}>{t('lib.col_item')}</Text>
                <Text style={[styles.colType, styles.headCell, {color: tokens.colors.faintText}]}>{t('lib.col_type')}</Text>
                <Text style={[styles.colMastery, styles.headCell, {color: tokens.colors.faintText}]}>{t('lib.col_mastery')}</Text>
                <Text style={[styles.colWhen, styles.headCell, {color: tokens.colors.faintText}]}>{t('lib.col_next')}</Text>
              </View>
              {paged.slice.map((item) => (
                <Pressable
                  key={item.word + item.added_at}
                  accessibilityRole="button"
                  accessibilityLabel={item.word}
                  onPress={() => setRevealed((current) => new Set(current).add(item.word))}
                  style={[styles.tableRow, {borderBottomColor: tokens.colors.border}]}
                >
                  <View style={styles.colItem}>
                    <Text style={[styles.cellWord, {color: tokens.colors.text}]}>{item.word}</Text>
                    <Text style={[styles.cellMuted, {color: tokens.colors.mutedText}]} numberOfLines={1}>
                      {revealed.has(item.word) || !item.due ? (item.definition || t('lib.no_definition')) : '•••'}
                    </Text>
                  </View>
                  <Text style={[styles.colType, styles.cellMuted, {color: tokens.colors.mutedText}]}>{typeName(itemType(item, language))}</Text>
                  <View style={styles.colMastery}><Mastery item={item} /></View>
                  <Text style={[styles.colWhen, styles.cellMuted, {color: item.due ? tokens.colors.accent : tokens.colors.mutedText}]}>{relativeText(item)}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
        {rows.length ? (
          <View style={styles.tableFoot}>
            <Text style={[styles.cellMuted, {color: tokens.colors.mutedText}]}>
              {t('lib.count_of').replace('{from}', String(paged.from)).replace('{to}', String(paged.to)).replace('{total}', String(rows.length))}
            </Text>
            <View style={styles.pager}>
              <Button label={t('lib.prev_page')} variant="outline" compact disabled={paged.page <= 1} onPress={() => setPage(paged.page - 1)} />
              <Button label={t('lib.next_page')} variant="outline" compact disabled={paged.page >= paged.pages} onPress={() => setPage(paged.page + 1)} />
            </View>
          </View>
        ) : null}
        <PanelCopy>{t('lib.stage_note')}</PanelCopy>
      </Card>

      {/* `.o-lib-rail`, stacked beneath the table on a phone. */}
      <Panel>
        <Label>{t('lib.your_review')}</Label>
        <View style={styles.legend}>
          {([['due', counts.due, tokens.colors.accent], ['soon', counts.soon, tokens.colors.attention], ['later', counts.later, tokens.colors.faintText]] as const).map(([key, value, colour]) => (
            <View key={key} style={styles.legendRow}>
              <View style={[styles.legendDot, {backgroundColor: colour}]} />
              <Text style={[styles.strong, {color: tokens.colors.text}]}>{value}</Text>
              <Text style={{color: tokens.colors.mutedText}}>{t(key === 'due' ? 'lib.due_now' : key === 'soon' ? 'lib.due_soon' : 'lib.not_due')}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <Panel>
        <View style={styles.panelHead}>
          <Label>{t('lib.daily_goal')}</Label>
          {!editingGoal ? <Button label={t('lib.edit_goal')} variant="outline" compact onPress={() => { setGoalDraft(String(goal)); setEditingGoal(true); }} /> : null}
        </View>
        <Text style={{color: tokens.colors.text}}>{t('lib.goal_progress').replace('{done}', String(doneToday)).replace('{goal}', String(goal))}</Text>
        <View style={[styles.track, {backgroundColor: tokens.colors.surfaceSunken}]}>
          <View style={[styles.trackFill, {width: `${Math.min(100, goal ? Math.round((doneToday / goal) * 100) : 0)}%`, backgroundColor: tokens.colors.accent}]} />
        </View>
        <PanelCopy>{doneToday >= goal ? t('lib.goal_hit') : t('lib.goal_left').replace('{n}', String(Math.max(0, goal - doneToday)))}</PanelCopy>
        {editingGoal ? (
          <View style={styles.goalEdit}>
            <TextInput
              accessibilityLabel={t('lib.daily_goal')} value={goalDraft} onChangeText={setGoalDraft}
              keyboardType="number-pad" placeholder={String(goal)} placeholderTextColor={tokens.colors.mutedText}
              style={[styles.goalInput, {color: tokens.colors.text, borderColor: tokens.colors.borderStrong}]}
            />
            <Button label={t('lib.save_goal')} compact onPress={() => { const value = Number(goalDraft); if (Number.isFinite(value) && value > 0) void writeLibraryGoal(value).then(refreshGoal); setEditingGoal(false); }} />
          </View>
        ) : null}
      </Panel>

      <Panel>
        <Label>{t('lib.accuracy')}</Label>
        {accuracy === null ? (
          <PanelCopy>{t('lib.accuracy_empty')}</PanelCopy>
        ) : (
          <>
            <Text style={[styles.accuracy, {color: tokens.colors.heading}]}>{accuracy}%</Text>
            <PanelCopy>{t('lib.accuracy_scope')} · {recalls}/{recalls + lapses}</PanelCopy>
          </>
        )}
      </Panel>

      <Panel>
        <Label>{t('lib.focus_areas')}</Label>
        {areas.length ? areas.map(([label, count]) => (
          <View key={label} style={styles.focusRow}>
            <Text style={{color: tokens.colors.text}}>{label}</Text>
            <Text style={[styles.strong, {color: tokens.colors.mutedText}]}>{t('lib.focus_due').replace('{n}', String(count))}</Text>
          </View>
        )) : <PanelCopy>{t('lib.focus_empty')}</PanelCopy>}
      </Panel>

      {notice ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{notice}</Text> : null}
      {review.isError ? <Text accessibilityRole="alert" style={{color: tokens.colors.danger}}>{t('library.review_failed')}</Text> : null}
      <Button label={t('library.open_reading')} onPress={() => router.replace('/(app)/reading')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flexGrow: 1, padding: 16, gap: 14, width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center'},
  title: {fontSize: 20, fontWeight: '700'},
  strong: {fontWeight: '600'},

  // `.o-recall-head{row-gap:14px;padding:18px}`
  recallHead: {padding: 18, gap: 14},
  recallIdentity: {flexDirection: 'row', alignItems: 'flex-start', gap: 12},
  recallIcon: {width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center'},
  recallCopy: {flex: 1, gap: 4},
  recallFoot: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  recallCount: {gap: 2},
  recallCountValue: {fontSize: 26, fontWeight: '700'},

  wordRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12},
  word: {fontSize: 17, fontWeight: '700'},
  actions: {flexDirection: 'row', gap: 8},
  actionSlot: {flex: 1},

  // `.o-lib-tabs{gap:8px}`
  tabs: {flexDirection: 'row', gap: 8, paddingVertical: 2},
  tab: {flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, borderWidth: 1},
  tabLabel: {fontSize: 13, fontWeight: '600'},
  tabCount: {fontSize: 12},
  // `.o-lib-tools{display:grid;grid-template-columns:1fr 1fr;gap:8px}`
  tools: {flexDirection: 'row', gap: 8},
  toolCell: {flex: 1},
  select: {minHeight: 44, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, justifyContent: 'center', gap: 1},
  selectLabel: {fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6},
  selectValue: {fontSize: 14, fontWeight: '500'},

  tableCard: {padding: 12, gap: 10},
  tableScroll: {minWidth: 640},
  table: {minWidth: 640},
  tableHead: {flexDirection: 'row', gap: 10, paddingBottom: 8, borderBottomWidth: 1},
  headCell: {fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6},
  tableRow: {flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, alignItems: 'center'},
  colItem: {width: 220, gap: 2},
  colType: {width: 110},
  colMastery: {width: 170},
  colWhen: {width: 120},
  cellWord: {fontSize: 15, fontWeight: '600'},
  cellMuted: {fontSize: 12},
  mastery: {gap: 4},
  masteryDots: {flexDirection: 'row', gap: 3},
  masteryDot: {width: 8, height: 8, borderRadius: 999},
  emptyState: {gap: 6, paddingVertical: 12},
  tableFoot: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8},
  pager: {flexDirection: 'row', gap: 8},

  legend: {gap: 6},
  legendRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  legendDot: {width: 10, height: 10, borderRadius: 999},
  panelHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  track: {height: 6, borderRadius: 999, overflow: 'hidden'},
  trackFill: {height: '100%', borderRadius: 999},
  goalEdit: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  goalInput: {flex: 1, borderWidth: 1, borderRadius: 15, padding: 10, minHeight: 44},
  accuracy: {fontSize: 24, fontWeight: '700'},
  focusRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
});

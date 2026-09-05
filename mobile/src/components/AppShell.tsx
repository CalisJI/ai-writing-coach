import {useMemo, useState, type PropsWithChildren} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {usePathname, useRouter} from 'expo-router';
import {useI18n} from '../i18n/I18nProvider';
import {useSession} from '../auth/SessionHarness';
import {createConfiguredApiClient} from '../api/client';
import {routeAvailable} from '../api/contracts/skills';
import {useSkills} from '../query/useSkills';
import {useSessionBootstrap} from '../query/useSessionBootstrap';
import {useTheme} from '../theme/ThemeProvider';
import {fontSizes, metrics, radii} from '../theme/tokens';
import {useScreenLayout} from '../theme/layout';
import {OrenaIcon, type OrenaIconName} from './OrenaIcon';

/**
 * The Orena shell, ported from `static/becoming/orena/shell.css` and
 * `templates/becoming/index.html`.
 *
 * The web is a 244px sidebar rail beside the workspace, and below 1023px the
 * rail becomes a `min(84vw,300px)` drawer over a scrim, reached from a toggle in
 * the sticky topbar. The native client previously had no chrome at all: no
 * topbar, no drawer, and therefore no way to reach eight of the nine
 * destinations unless a screen happened to link to them.
 *
 * The nav order is the template's: home, write, read, listen, speak, grammar,
 * library, journey, profile.
 */
const DESTINATIONS: readonly {route: string; icon: OrenaIconName; label: string}[] = [
  {route: '/(app)', icon: 'home', label: 'nav.home'},
  {route: '/(app)/writing', icon: 'write', label: 'nav.writing'},
  {route: '/(app)/reading', icon: 'read', label: 'nav.reading'},
  {route: '/(app)/listening', icon: 'listen', label: 'nav.listening'},
  {route: '/(app)/speaking', icon: 'speak', label: 'nav.speaking'},
  {route: '/(app)/grammar', icon: 'grammar', label: 'nav.grammar'},
  {route: '/(app)/library', icon: 'library', label: 'nav.library'},
  {route: '/(app)/journey', icon: 'journey', label: 'nav.journey'},
  {route: '/(app)/profile', icon: 'profile', label: 'nav.profile'},
];

/** `shell.js` TITLE_KEYS: the header names the destination, not the verb. */
const TITLE_BY_ROUTE: Record<string, string> = {
  '/(app)': 'nav.home',
  '/(app)/writing': 'writing.practice_title',
  '/(app)/review': 'review.title',
  '/(app)/reading': 'reading.title',
  '/(app)/listening': 'listening.title',
  '/(app)/speaking': 'speaking.title',
  '/(app)/grammar': 'grammar.title',
  '/(app)/library': 'library.title',
  '/(app)/journey': 'journey.title',
  '/(app)/profile': 'profile.title',
};

function normalize(pathname: string): string {
  if (pathname === '/' || pathname === '' || pathname === '/(app)') return '/(app)';
  const segment = pathname.split('/').filter(Boolean).pop();
  return segment ? `/(app)/${segment}` : '/(app)';
}

function NavList({active, destinations, onNavigate}: {active: string; destinations: typeof DESTINATIONS; onNavigate: (route: string) => void}) {
  const {t} = useI18n();
  const {tokens} = useTheme();
  return (
    <View style={styles.nav}>
      {destinations.map(({route, icon, label}) => {
        const current = route === active;
        return (
          <Pressable
            key={route}
            accessibilityRole="link"
            accessibilityLabel={t(label as never)}
            accessibilityState={{selected: current}}
            onPress={() => onNavigate(route)}
            style={[styles.navItem, current && {backgroundColor: tokens.colors.surfaceSunken}]}
          >
            <OrenaIcon name={icon} size={21} color={current ? tokens.colors.accent : tokens.colors.mutedText} />
            <Text style={[styles.navLabel, {color: current ? tokens.colors.text : tokens.colors.mutedText}]}>{t(label as never)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppShell({children}: PropsWithChildren) {
  const {t} = useI18n();
  const {tokens, scheme, setPreference} = useTheme();
  const {wide} = useScreenLayout();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const {sessionCookie} = useSession();
  const client = useMemo(() => { try { return createConfiguredApiClient(); } catch { return null; } }, []);
  const skills = useSkills(client, sessionCookie);
  const bootstrap = useSessionBootstrap(client ?? undefined, sessionCookie);
  const internal = bootstrap.data?.user.is_admin === true;
  // The web hides Write, Read, Listen and Speak until the release contract says
  // the skill is available; advertising them before that promises what the
  // product has not released. Until the contract answers, only ungated
  // destinations are shown.
  const destinations = useMemo(
    () => DESTINATIONS.filter(({route}) => routeAvailable(route, skills.data?.skills, {internal})),
    [skills.data, internal],
  );
  const active = normalize(pathname ?? '/');
  const titleKey = TITLE_BY_ROUTE[active] ?? 'nav.home';

  const go = (route: string) => {
    setDrawerOpen(false);
    router.push(route as never);
  };

  const rail = (
    <View style={[styles.sidebar, {backgroundColor: tokens.colors.surface, borderRightColor: tokens.colors.border}]}>
      <Text style={[styles.brand, {color: tokens.colors.text}]}>{t('app.name')}</Text>
      <ScrollView>
        <NavList active={active} destinations={destinations} onNavigate={go} />
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.shell, {backgroundColor: tokens.colors.background}]}>
      {/* The rail is a permanent column above the breakpoint, exactly as the web. */}
      {wide ? rail : null}
      <View style={styles.workspace}>
        <View style={[styles.topbar, {paddingTop: insets.top, minHeight: metrics.headerHeight + insets.top, backgroundColor: tokens.colors.background, borderBottomColor: tokens.colors.border}]}>
          {!wide ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('nav.open_menu' as never)}
              accessibilityState={{expanded: drawerOpen}}
              onPress={() => setDrawerOpen(true)}
              style={styles.iconButton}
            >
              <OrenaIcon name="menu" size={20} color={tokens.colors.text} />
            </Pressable>
          ) : null}
          <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, {color: tokens.colors.text}]}>{t(titleKey as never)}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(scheme === 'dark' ? 'theme.light' : 'theme.dark')}
            onPress={() => setPreference(scheme === 'dark' ? 'light' : 'dark')}
            style={styles.iconButton}
          >
            <OrenaIcon name={scheme === 'dark' ? 'sun' : 'moon'} size={20} color={tokens.colors.text} />
          </Pressable>
        </View>
        <View style={styles.main}>{children}</View>
      </View>

      {/* Below the breakpoint the same nav becomes a drawer over a scrim. */}
      <Modal visible={!wide && drawerOpen} transparent animationType="fade" onRequestClose={() => setDrawerOpen(false)}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('nav.close_menu' as never)} onPress={() => setDrawerOpen(false)} style={styles.scrim}>
          <Pressable
            // Swallow presses inside the drawer so it does not close itself.
            onPress={() => undefined}
            style={[styles.drawer, {paddingTop: insets.top + 16, backgroundColor: tokens.colors.surface}]}
          >
            <View style={styles.drawerHead}>
              <Text style={[styles.brand, {color: tokens.colors.text}]}>{t('app.name')}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={t('nav.close_menu' as never)} onPress={() => setDrawerOpen(false)} style={styles.iconButton}>
                <OrenaIcon name="close" size={20} color={tokens.colors.text} />
              </Pressable>
            </View>
            <ScrollView>
              <NavList active={active} destinations={destinations} onNavigate={go} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {flex: 1, flexDirection: 'row'},
  sidebar: {width: metrics.sidebarWidth, borderRightWidth: 1, paddingHorizontal: 16, paddingVertical: 22, gap: 20},
  workspace: {flex: 1, minWidth: 0},
  // `.o-topbar`: sticky, canvas background, bottom border, title at 20/600.
  topbar: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, borderBottomWidth: 1},
  title: {flex: 1, minWidth: 0, fontSize: fontSizes.title, fontWeight: '600', letterSpacing: -0.2},
  iconButton: {width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.chip},
  main: {flex: 1, minHeight: 0},
  brand: {fontSize: fontSizes.title, fontWeight: '700', letterSpacing: -0.3},
  nav: {gap: 2},
  // `.o-nav a`: 44px tall, 13px gap, field radius, body at 500.
  navItem: {flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 44, paddingHorizontal: 12, borderRadius: radii.field},
  navLabel: {fontSize: fontSizes.body, fontWeight: '500'},
  scrim: {flex: 1, flexDirection: 'row', backgroundColor: 'rgba(10,9,8,.44)'},
  drawer: {width: '84%', maxWidth: 300, paddingHorizontal: 16, paddingBottom: 18, gap: 20},
  drawerHead: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
});

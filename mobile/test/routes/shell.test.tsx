import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import {AppShell} from '../../src/components/AppShell';
import {ORENA_ICON_NAMES} from '../../src/components/OrenaIcon';

const mockPush = jest.fn();
let mockPathname = '/';
let mockWidth = 411;
let mockIsAdmin = false;
const skill = (key: string, publicAvailable: boolean, internalAvailable = true) => ({key, release_state: publicAvailable ? 'public' : 'beta', source_available: true, internal_available: internalAvailable, public_available: publicAvailable});
let mockSkills = [skill('writing', true), skill('reading', true), skill('listening', true), skill('speaking', true)];

jest.mock('expo-router', () => ({useRouter: () => ({push: mockPush}), usePathname: () => mockPathname}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({sessionCookie: 'cookie'})}));
jest.mock('../../src/api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../src/query/useSkills', () => ({useSkills: () => ({data: {api_version: 1, policy: 'language-wide', language_scope: ['en'], skills: mockSkills}, isPending: false, isError: false})}));
jest.mock('../../src/query/useSessionBootstrap', () => ({useSessionBootstrap: () => ({data: {user: {is_admin: mockIsAdmin}}, isPending: false, isError: false})}));
jest.mock('react-native-safe-area-context', () => ({useSafeAreaInsets: () => ({top: 24, bottom: 0, left: 0, right: 0})}));
jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: () => ({width: mockWidth, height: 900, scale: 2, fontScale: 1}),
}));

const render = (locale: 'en' | 'zh' = 'en') =>
  renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><AppShell><></></AppShell></ThemeProvider></I18nProvider>);

const links = (view: renderer.ReactTestRenderer) =>
  view.root.findAll((node) => node.props.accessibilityRole === 'link' && typeof node.props.onPress === 'function');
const buttonNamed = (view: renderer.ReactTestRenderer, label: string) =>
  view.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];

describe('Orena shell', () => {
  beforeEach(() => {
    mockPush.mockReset(); mockPathname = '/'; mockWidth = 411; mockIsAdmin = false;
    mockSkills = [skill('writing', true), skill('reading', true), skill('listening', true), skill('speaking', true)];
  });

  // The native client previously rendered no chrome at all, so eight of the nine
  // destinations were unreachable unless a screen happened to link to them.
  it('offers every destination the web rail lists, in the same order', () => {
    mockWidth = 1280;
    const view = render();
    expect(links(view).map((node) => String(node.props.accessibilityLabel))).toEqual([
      'Home', 'Writing', 'Reading', 'Listening', 'Speaking', 'Grammar', 'Library', 'Journey', 'Profile',
    ]);
  });

  it('marks the current destination rather than leaving the learner unplaced', () => {
    mockWidth = 1280;
    mockPathname = '/(app)/journey';
    const view = render();
    const selected = links(view).filter((node) => node.props.accessibilityState?.selected === true);
    expect(selected).toHaveLength(1);
    expect(String(selected[0]?.props.accessibilityLabel)).toBe('Journey');
  });

  it('keeps the rail permanent above the breakpoint and behind a toggle below it', () => {
    mockWidth = 1280;
    expect(buttonNamed(render(), 'Open navigation')).toBeUndefined();
    mockWidth = 411;
    expect(buttonNamed(render(), 'Open navigation')).toBeDefined();
  });

  it('opens the drawer and routes from it on a phone', () => {
    const view = render();
    act(() => buttonNamed(view, 'Open navigation')?.props.onPress());
    const journey = links(view).find((node) => node.props.accessibilityLabel === 'Journey');
    expect(journey).toBeDefined();
    act(() => journey?.props.onPress());
    expect(mockPush).toHaveBeenCalledWith('/(app)/journey');
  });

  it.each(['en', 'zh'] as const)('names the destination in the header in %s', (locale) => {
    mockPathname = '/(app)/library';
    const view = render(locale);
    const headers = view.root.findAll((node) => node.props.accessibilityRole === 'header');
    expect(headers.map((node) => String(node.props.children))).toContain(locale === 'zh' ? '已保存的单词' : 'Saved words');
  });

  // The web hides Write, Read, Listen and Speak until the release contract says
  // the skill is available; the shell must not advertise an unreleased skill.
  it('hides a skill the release contract has not made public', () => {
    mockWidth = 1280;
    mockSkills = [skill('writing', true), skill('reading', false), skill('listening', false), skill('speaking', false)];
    const labels = links(render()).map((node) => String(node.props.accessibilityLabel));
    expect(labels).toContain('Writing');
    for (const hidden of ['Reading', 'Listening', 'Speaking']) expect(labels).not.toContain(hidden);
    // Ungated destinations stay.
    for (const kept of ['Home', 'Grammar', 'Library', 'Journey', 'Profile']) expect(labels).toContain(kept);
  });

  it('shows internally available skills to an admin, as the web does', () => {
    mockWidth = 1280;
    mockSkills = [skill('writing', false), skill('reading', false), skill('listening', false), skill('speaking', false)];
    expect(links(render()).map((node) => String(node.props.accessibilityLabel))).not.toContain('Reading');
    mockIsAdmin = true;
    expect(links(render()).map((node) => String(node.props.accessibilityLabel))).toContain('Reading');
  });

  it('ships the designed icon set rather than substituting emoji', () => {
    // static/becoming/orena/icons.js is the source; emoji are not a substitute.
    for (const name of ['home', 'write', 'read', 'listen', 'speak', 'grammar', 'library', 'journey', 'profile', 'menu', 'close', 'sun', 'moon']) {
      expect(ORENA_ICON_NAMES).toContain(name);
    }
  });
});

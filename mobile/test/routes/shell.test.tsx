import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import {AppShell} from '../../src/components/AppShell';
import {ORENA_ICON_NAMES} from '../../src/components/OrenaIcon';

const mockPush = jest.fn();
let mockPathname = '/';
let mockWidth = 411;

jest.mock('expo-router', () => ({useRouter: () => ({push: mockPush}), usePathname: () => mockPathname}));
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
  beforeEach(() => { mockPush.mockReset(); mockPathname = '/'; mockWidth = 411; });

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

  it('ships the designed icon set rather than substituting emoji', () => {
    // static/becoming/orena/icons.js is the source; emoji are not a substitute.
    for (const name of ['home', 'write', 'read', 'listen', 'speak', 'grammar', 'library', 'journey', 'profile', 'menu', 'close', 'sun', 'moon']) {
      expect(ORENA_ICON_NAMES).toContain(name);
    }
  });
});

import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../i18n/I18nProvider';
import {ThemeProvider} from '../theme/ThemeProvider';
import {EmptyState, ErrorState, LoadingState, SignedOutState} from './states';

const render = (node: React.ReactNode, locale: 'en' | 'zh' = 'en') => {
  let view!: renderer.ReactTestRenderer;
  act(() => { view = renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider>{node}</ThemeProvider></I18nProvider>); });
  return view;
};
const text = (view: renderer.ReactTestRenderer) => JSON.stringify(view.toJSON());
// findAllByProps matches the composite element and its host node, so count hosts.
const bars = (view: renderer.ReactTestRenderer) => view.root.findAll((node) => node.props.accessibilityElementsHidden === true && typeof node.type === 'string');

describe('shared states', () => {
  /* The three facts the product keeps apart: nothing loaded yet, something
     broke, and nothing is there. Only the middle one is an alert. */
  it('announces loading without announcing a failure', () => {
    const view = render(<LoadingState lines={3} />);
    expect(view.root.findAllByProps({accessibilityRole: 'progressbar'})).not.toHaveLength(0);
    expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
  });

  it('draws one skeleton bar per requested line', () => {
    expect(bars(render(<LoadingState lines={5} />))).toHaveLength(5);
    // A screen asking for none still gets one, rather than an invisible state.
    expect(bars(render(<LoadingState lines={0} />))).toHaveLength(1);
  });

  it('hides the decorative bars from assistive technology', () => {
    expect(bars(render(<LoadingState lines={2} />)).every((bar) => bar.props.importantForAccessibility === 'no-hide-descendants')).toBe(true);
  });

  it('localises the loading announcement', () => {
    expect(render(<LoadingState />, 'en').root.findByProps({accessibilityRole: 'progressbar'}).props.accessibilityLabel).toBe('Loading…');
    expect(render(<LoadingState />, 'zh').root.findByProps({accessibilityRole: 'progressbar'}).props.accessibilityLabel).toBe('加载中…');
  });

  it('announces an error and shows its message', () => {
    const view = render(<ErrorState message="Journey is unavailable." />);
    expect(view.root.findAllByProps({accessibilityRole: 'alert'})).not.toHaveLength(0);
    expect(text(view)).toContain('Journey is unavailable.');
  });

  /* An empty library is not a failure, so it must not be announced as one. */
  it('does not dress an empty state as an error', () => {
    const view = render(<EmptyState title="No saved words yet." body="Save a word while reading." />);
    expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
    expect(text(view)).toContain('No saved words yet.');
    expect(text(view)).toContain('Save a word while reading.');
  });

  it('does not dress being signed out as an error either', () => {
    const view = render(<SignedOutState message="Sign in to view your journey." />);
    expect(view.root.findAllByProps({accessibilityRole: 'alert'})).toHaveLength(0);
    expect(text(view)).toContain('Sign in to view your journey.');
  });

  it('renders an action when one is given', () => {
    const view = render(<EmptyState title="Nothing yet" action={<React.Fragment>go</React.Fragment>} />);
    expect(text(view)).toContain('go');
  });
});

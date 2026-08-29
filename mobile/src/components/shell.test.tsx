import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {Pressable} from 'react-native';
import {Text} from 'react-native';
import {AccessibleButton} from './AccessibleButton';
import {AppErrorBoundary, TestShellProviders} from './AppErrorBoundary';

describe('shell accessibility and degraded state', () => {
  it('exposes a labeled touch-sized button', () => {
    const tree = renderer.create(<TestShellProviders><AccessibleButton label="Continue" /></TestShellProviders>);
    const button = tree.root.findByType(Pressable);
    expect(button.props.accessible).toBe(true);
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toBe('Continue');
    expect(button.props.style({pressed: false})[0][0].minHeight).toBe(48);
  });

  it('renders a truthful localized error fallback and can reset', () => {
    let shouldThrow = true;
    const Child = () => {
      if (shouldThrow) throw new Error('test');
      return <AccessibleButton label="Ready" />;
    };
    const tree = renderer.create(<TestShellProviders><AppErrorBoundary onReset={() => {shouldThrow = false;}}><Child /></AppErrorBoundary></TestShellProviders>);
    expect(tree.root.findAllByProps({accessibilityRole: 'alert'}).length).toBeGreaterThan(0);
    expect(tree.root.findAllByType(Text).some((node) => node.props.children === 'Orena could not show this screen')).toBe(true);
    expect(tree.root.findByProps({accessibilityLabel: 'Try again'})).toBeDefined();
    act(() => { tree.root.findByProps({accessibilityLabel: 'Try again'}).props.onPress(); });
    tree.update(<TestShellProviders><AppErrorBoundary onReset={() => {shouldThrow = false;}}><Child /></AppErrorBoundary></TestShellProviders>);
    expect(tree.root.findByProps({accessibilityLabel: 'Ready'})).toBeDefined();
  });
});

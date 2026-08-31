import React, {Component, type ErrorInfo, type PropsWithChildren, type ReactNode} from 'react';
import {Text, View} from 'react-native';
import {AccessibleButton} from './AccessibleButton';
import {I18nProvider, useI18n} from '../i18n/I18nProvider';
import {ThemeProvider, useTheme} from '../theme/ThemeProvider';

type BoundaryProps = PropsWithChildren<{onReset?: () => void}>;
type BoundaryState = {error: Error | null};

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): BoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Deliberately do not log learner content or error payloads in this shell.
    void error;
    void info;
  }

  reset = () => {
    this.setState({error: null});
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return <ErrorFallback onRetry={this.reset} />;
  }
}

function ErrorFallback({onRetry}: {onRetry: () => void}) {
  const {tokens} = useTheme();
  const {t} = useI18n();
  return (
    <View accessible accessibilityRole="alert" style={{flex: 1, padding: tokens.spacing.large, backgroundColor: tokens.colors.background, justifyContent: 'center'}}>
      <Text accessibilityRole="header" style={{fontSize: 22, fontWeight: '700', color: tokens.colors.heading, marginBottom: tokens.spacing.small}}>{t('error.title')}</Text>
      <Text style={{fontSize: 16, color: tokens.colors.mutedText, marginBottom: tokens.spacing.large}}>{t('error.body')}</Text>
      <AccessibleButton label={t('error.retry')} onPress={onRetry} />
    </View>
  );
}

export function AppErrorBoundary({children, onReset}: BoundaryProps) {
  return <Boundary onReset={onReset}>{children}</Boundary>;
}

export function TestShellProviders({children}: PropsWithChildren) {
  return <ThemeProvider><I18nProvider>{children}</I18nProvider></ThemeProvider>;
}

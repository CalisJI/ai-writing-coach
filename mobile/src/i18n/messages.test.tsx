import React from 'react';
import renderer from 'react-test-renderer';
import {Text} from 'react-native';
import {I18nProvider, useI18n} from './I18nProvider';
import {messages, translate, type MessageId} from './messages';

describe('EN/ZH message foundation', () => {
  it('keeps the same learner-visible message IDs in both locales', () => {
    const ids = Object.keys(messages.en) as MessageId[];
    expect(ids.sort()).toEqual((Object.keys(messages.zh) as MessageId[]).sort());
    for (const id of ids) expect(translate('zh', id)).not.toHaveLength(0);
  });

  it('renders the shell message foundation in English and Chinese', () => {
    function Probe() {
      const {t} = useI18n();
      return <Text>{`${t('nav.home')} — ${t('shell.placeholder')}`}</Text>;
    }
    const english = renderer.create(<I18nProvider initialLocale="en"><Probe /></I18nProvider>);
    const chinese = renderer.create(<I18nProvider initialLocale="zh"><Probe /></I18nProvider>);
    expect(english.root.findByType(Text).props.children).toContain('Home');
    expect(chinese.root.findByType(Text).props.children).toContain('首页');
    expect(chinese.root.findByType(Text).props.children).toContain('原生页面');
  });
});

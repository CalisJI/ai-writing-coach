import React from 'react';
import renderer from 'react-test-renderer';
import {Text} from 'react-native';
import {I18nProvider, useI18n} from './I18nProvider';
import {MESSAGE_CATALOGUES, messages, translate, type MessageId} from './messages';

describe('EN/ZH message foundation', () => {
  it('keeps the same learner-visible message IDs in both locales', () => {
    const ids = Object.keys(messages.en) as MessageId[];
    expect(ids.sort()).toEqual((Object.keys(messages.zh) as MessageId[]).sort());
    for (const id of ids) expect(translate('zh', id)).not.toHaveLength(0);
  });

  it('keeps every catalogue at EN/ZH parity, including Speaking and the learner flows', () => {
    for (const [name, catalogue] of Object.entries(MESSAGE_CATALOGUES)) {
      const en = Object.keys(catalogue.en).sort();
      const zh = Object.keys(catalogue.zh).sort();
      expect({[name]: zh}).toEqual({[name]: en});
    }
  });

  it('never renders a raw message id to a learner in either locale', () => {
    const ids = Object.values(MESSAGE_CATALOGUES).flatMap((catalogue) => Object.keys(catalogue.en)) as MessageId[];
    const special: MessageId[] = ['speaking.pronunciation_unavailable', 'speaking.profile_loading', 'speaking.profile_failed'];
    for (const id of [...ids, ...special]) {
      for (const locale of ['en', 'zh'] as const) {
        const value = translate(locale, id);
        // `translate` returns the id itself when a key is missing, so an id-shaped
        // result means the learner would be shown "profile.title" verbatim.
        expect(value).not.toBe(id);
        expect(value.trim()).not.toHaveLength(0);
      }
    }
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

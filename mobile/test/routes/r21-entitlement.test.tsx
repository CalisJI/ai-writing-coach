import React from 'react';
import renderer, {act} from 'react-test-renderer';
import {I18nProvider} from '../../src/i18n/I18nProvider';
import {ThemeProvider} from '../../src/theme/ThemeProvider';
import ProfileScreen from '../../app/(app)/profile';

const mockProfile = {isPending: false, isError: false, data: {exists: true, language: 'en', goal: 'everyday', style: 'guided', pinyin: 'auto', native_language: 'vi', theme_preset: 'editorial', updated_at: '2026-01-01'}};
const mockSave = {isPending: false, mutateAsync: jest.fn(() => Promise.resolve({}))};
const mockLanguage = {isPending: false, mutateAsync: jest.fn(() => Promise.resolve({ok: true, active: 'zh'}))};
let mockProduct = {isPending: false, isError: false, data: undefined as unknown};
let mockCookie: string | null = 'cookie';
let mockSessionStatus: 'authenticated' | 'signed-out' = 'authenticated';

jest.mock('expo-router', () => ({useRouter: () => ({push: jest.fn(), replace: jest.fn()})}));
jest.mock('../../src/auth/SessionHarness', () => ({useSession: () => ({sessionCookie: mockCookie, session: {status: mockSessionStatus}})}));
jest.mock('../../src/api/client', () => ({createConfiguredApiClient: () => ({}), ApiClient: class {}}));
jest.mock('../../src/query/useLearnerProfile', () => ({useLearnerProfile: () => mockProfile, useSaveLearnerProfile: () => mockSave, useSetLearningLanguage: () => mockLanguage}));
jest.mock('../../src/query/useProductMe', () => ({useProductMe: () => mockProduct}));
// Profile now shows the growth rank, which reads the learning memory.
jest.mock('../../src/query/useHome', () => ({useLearningMemory: () => ({isPending: false, isError: false, data: {}})}));

const account = (featureState: 'enabled' | 'exhausted' | 'unavailable') => ({
  available: true, plan: {id: 'free', name: 'Free', description: 'Core writing practice.', price_label: 'Free'}, subscription: {state: 'active', status: 'active'}, plan_state: 'active', billing_ready: false,
  features: {'writing.evaluate': {key: 'writing.evaluate', enabled: featureState === 'enabled', monthly_limit: 30, used: featureState === 'exhausted' ? 30 : 0, remaining: featureState === 'exhausted' ? 0 : 30, usage_state: featureState === 'unavailable' ? 'unavailable' : 'known', entitlement_state: featureState}},
});

function render(locale: 'en' | 'zh' = 'en') { return renderer.create(<I18nProvider initialLocale={locale}><ThemeProvider><ProfileScreen /></ThemeProvider></I18nProvider>); }
function text(view: renderer.ReactTestRenderer) { return view.root.findAll((node) => typeof node.props.children === 'string').map((node) => node.props.children).join(' '); }

describe('R21 native entitlement presentation', () => {
  beforeEach(() => { mockCookie = 'cookie'; mockSessionStatus = 'authenticated'; mockProfile.isPending = false; mockProfile.isError = false; mockProduct = {isPending: false, isError: false, data: account('enabled')}; });

  it.each(['en', 'zh'] as const)('renders enabled and exhausted server states without raw enums in %s', (locale) => {
    let view = render(locale); expect(text(view)).toContain(locale === 'en' ? '30 remaining of 30' : '剩余 30 / 30'); expect(text(view)).not.toContain('enabled');
    mockProduct = {isPending: false, isError: false, data: account('exhausted')}; view = render(locale); expect(text(view)).toContain(locale === 'en' ? 'Limit reached' : '已达到限额'); expect(text(view)).not.toContain('exhausted');
  });

  it.each(['en', 'zh'] as const)('renders unavailable, loading, and signed-out entitlement states in %s', (locale) => {
    mockProduct = {isPending: false, isError: false, data: account('unavailable')}; let view = render(locale); expect(text(view)).toContain(locale === 'en' ? 'Usage unavailable' : '用量不可用');
    mockProduct = {isPending: false, isError: false, data: {available: false, plan: null, subscription: {state: 'unknown', status: 'unknown'}, features: {}, billing_ready: false}}; view = render(locale); expect(text(view)).toContain(locale === 'en' ? 'Plan availability unavailable' : '计划可用性不可用');
    mockProduct = {isPending: true, isError: false, data: undefined}; view = render(locale); expect(text(view)).toContain(locale === 'en' ? 'Loading your profile' : '正在加载个人资料');
    mockCookie = null; mockSessionStatus = 'signed-out'; view = render(locale); expect(text(view)).toContain(locale === 'en' ? 'Sign in to view your plan' : '登录后即可查看计划');
  });

  it.each(['en', 'zh'] as const)('keeps purchase handoff explicitly deferred in %s', async (locale) => {
    const view = render(locale); const button = view.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === (locale === 'en' ? 'Explore plan options' : '查看计划选项'))[0]; await act(async () => { button?.props.onPress(); }); expect(text(view)).toContain(locale === 'en' ? 'Store purchase is not available yet' : '商店购买尚未开放');
  });
});

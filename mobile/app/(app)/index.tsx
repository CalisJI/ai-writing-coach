import {useI18n} from '../../src/i18n/I18nProvider';
import {ShellScreen} from '../../src/components/ShellScreen';

export default function HomeScreen() {
  const {t} = useI18n();
  return <ShellScreen title={t('nav.home')} />;
}

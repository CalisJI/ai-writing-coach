import {ShellScreen} from '../../src/components/ShellScreen';
import {useI18n} from '../../src/i18n/I18nProvider';
export default function ReviewScreen() { const {t} = useI18n(); return <ShellScreen title={t('nav.review')} />; }

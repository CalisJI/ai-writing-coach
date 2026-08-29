import {ApiError} from './errors';
import {cacheDegradedMessage} from './degradedMessages';
import {translate} from '../i18n/messages';

describe('cache degraded-state localization', () => {
  it('maps offline, timeout, auth expiry, and unavailable states to shared EN/ZH copy', () => {
    const errors = [
      new ApiError('network_unavailable', 'offline'), new ApiError('timeout', 'slow'),
      new ApiError('authentication_required', 'expired'), new ApiError('server_unavailable', 'down'),
    ];
    for (const error of errors) {
      const id = cacheDegradedMessage(error);
      expect(id.startsWith('cache.')).toBe(true);
      expect(translate('en', id)).not.toBe(translate('zh', id));
    }
  });
});

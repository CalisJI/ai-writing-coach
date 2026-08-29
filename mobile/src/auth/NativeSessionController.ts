import type {ApiClient} from '../api/client';
import type {ApiErrorCategory} from '../api/errors';
import type {SecureSessionStorage} from './secureSessionStorage';

export type SessionRestoreResult =
  | {status: 'signed-out'}
  | {status: 'restored'; sessionCookie: string}
  | {status: 'unavailable'; errorCategory: ApiErrorCategory | 'unknown'};

export type SessionLogoutResult = {serverInvalidated: false};

export class NativeSessionController {
  constructor(private readonly storage: SecureSessionStorage) {}

  async restore(): Promise<SessionRestoreResult> {
    try {
      const sessionCookie = await this.storage.read();
      return sessionCookie ? {status: 'restored', sessionCookie} : {status: 'signed-out'};
    } catch {
      return {status: 'unavailable', errorCategory: 'unknown'};
    }
  }

  async logout(sessionCookie: string | null, client?: ApiClient): Promise<SessionLogoutResult> {
    try {
      if (sessionCookie && client) {
        await client.logout({sessionCookie});
      }
    } finally {
      await this.storage.clear();
    }
    // The current signed-cookie endpoint clears only its request session. The
    // native client owns the reusable cookie, so report local-only clearing
    // truthfully until a durable server revocation store exists.
    return {serverInvalidated: false};
  }

  async clearLocal(): Promise<void> {
    await this.storage.clear();
  }
}

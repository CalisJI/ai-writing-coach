import type {ApiClient} from '../api/client';
import {NativeSessionController} from './NativeSessionController';
import type {SecureSessionStorage} from './secureSessionStorage';

function storage(overrides: Partial<SecureSessionStorage> = {}): SecureSessionStorage {
  return {read: jest.fn().mockResolvedValue(null), write: jest.fn(), clear: jest.fn(), ...overrides};
}

describe('native session lifecycle', () => {
  it('restores only a stored cookie and reports storage failures as unavailable', async () => {
    expect(await new NativeSessionController(storage({read: jest.fn().mockResolvedValue('signed-cookie')})).restore())
      .toEqual({status: 'restored', sessionCookie: 'signed-cookie'});
    expect(await new NativeSessionController(storage()).restore()).toEqual({status: 'signed-out'});
    expect(await new NativeSessionController(storage({read: jest.fn().mockRejectedValue(new Error('keychain unavailable'))})).restore())
      .toEqual({status: 'unavailable', errorCategory: 'unknown'});
  });

  it('clears local material and reports signed-cookie logout as local-only', async () => {
    const local = storage();
    const client = {logout: jest.fn().mockResolvedValue(undefined)} as unknown as ApiClient;
    await expect(new NativeSessionController(local).logout('signed-cookie', client)).resolves.toEqual({serverInvalidated: false});
    expect(client.logout).toHaveBeenCalledWith({sessionCookie: 'signed-cookie'});
    expect(local.clear).toHaveBeenCalledTimes(1);

    const failed = storage({clear: jest.fn().mockResolvedValue(undefined)});
    const failedClient = {logout: jest.fn().mockRejectedValue(new Error('offline'))} as unknown as ApiClient;
    await expect(new NativeSessionController(failed).logout('signed-cookie', failedClient)).rejects.toThrow('offline');
    expect(failed.clear).toHaveBeenCalledTimes(1);
  });
});

import {MemoryKeyValueStorage} from '../../storage/boundedCache';
import {clearListeningResume, readListeningResume, writeListeningResume} from './listeningResume';

describe('canonical Listening resume state', () => {
  it('round-trips only asset, segment, mode, and source identity', async () => {
    const storage = new MemoryKeyValueStorage();
    await writeListeningResume({assetId: 'asset-en-1', segmentId: 'segment-2', mode: 'active', sourceUrl: 'https://youtu.be/example'}, storage);
    await expect(readListeningResume(storage)).resolves.toEqual({assetId: 'asset-en-1', segmentId: 'segment-2', mode: 'active', sourceUrl: 'https://youtu.be/example'});
    await clearListeningResume(storage);
    await expect(readListeningResume(storage)).resolves.toBeNull();
  });

  it('drops malformed persisted state instead of resuming the wrong lesson', async () => {
    const storage = new MemoryKeyValueStorage();
    await storage.setItem('orena.listening.resume.v1', JSON.stringify({assetId: 'asset', segmentId: 'segment', mode: 'shadowing', sourceUrl: 'https://youtu.be/example'}));
    await expect(readListeningResume(storage)).resolves.toBeNull();
    await expect(storage.getItem('orena.listening.resume.v1')).resolves.toBeNull();
  });
});

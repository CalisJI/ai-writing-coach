import {MemoryKeyValueStorage} from '../../storage/boundedCache';
import {clearListeningResume, readListeningResume, writeListeningResume} from './listeningResume';

describe('canonical Listening resume state', () => {
  it('round-trips imported and curated lesson identity without storing the transcript', async () => {
    const storage = new MemoryKeyValueStorage();
    await writeListeningResume({assetId: 'asset-en-1', segmentId: 'segment-2', mode: 'shadowing', sourceUrl: 'https://commons.wikimedia.org/wiki/File:example.ogg', lessonId: 'en-example'}, storage);
    await expect(readListeningResume(storage)).resolves.toEqual({assetId: 'asset-en-1', segmentId: 'segment-2', mode: 'shadowing', sourceUrl: 'https://commons.wikimedia.org/wiki/File:example.ogg', lessonId: 'en-example'});
    await clearListeningResume(storage);
    await expect(readListeningResume(storage)).resolves.toBeNull();
  });

  it('drops malformed persisted state instead of resuming the wrong lesson', async () => {
    const storage = new MemoryKeyValueStorage();
    await storage.setItem('orena.listening.resume.v1', JSON.stringify({assetId: 'asset', segmentId: 'segment', mode: 'unsupported', sourceUrl: 'https://youtu.be/example'}));
    await expect(readListeningResume(storage)).resolves.toBeNull();
    await expect(storage.getItem('orena.listening.resume.v1')).resolves.toBeNull();
  });
});

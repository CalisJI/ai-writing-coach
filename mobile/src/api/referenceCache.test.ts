import {ApiError} from './errors';
import {StrokeOrderCache} from './referenceCache';
import {MemoryKeyValueStorage} from '../storage/boundedCache';

const data = {
  word: '学', glyph_size: 1024,
  characters: [{character: '学', stroke_count: 8, stroke_paths: ['M1'], medians: [[1, 2]], radical_strokes: []}],
  unavailable: [], source: 'make-me-a-hanzi', source_version: 'v1',
};

describe('immutable reference cache', () => {
  it('stores validated data, revalidates with 304, and reuses the matching representation', async () => {
    const client = {getChineseStrokeOrder: jest.fn()
      .mockResolvedValueOnce({kind: 'fresh', data, etag: '"v1"', cacheControl: 'public, max-age=31536000, immutable'})
      .mockResolvedValueOnce({kind: 'not_modified', etag: '"v1"', cacheControl: 'public, max-age=31536000, immutable'})};
    const cache = new StrokeOrderCache(client as never, new MemoryKeyValueStorage());
    await expect(cache.get('学')).resolves.toMatchObject({freshness: 'fresh', fromCache: false, sourceVersion: 'v1'});
    await expect(cache.get('学')).resolves.toMatchObject({freshness: 'fresh', fromCache: true, data});
    expect(client.getChineseStrokeOrder).toHaveBeenLastCalledWith('学', expect.objectContaining({ifNoneMatch: '"v1"'}));
  });

  it('does not retain no-store data and exposes safe stale data only for transient read failures', async () => {
    const client = {getChineseStrokeOrder: jest.fn()
      .mockResolvedValueOnce({kind: 'fresh', data, etag: '"v1"', cacheControl: 'no-store'})
      .mockRejectedValueOnce(new ApiError('network_unavailable', 'offline'))};
    const storage = new MemoryKeyValueStorage();
    const cache = new StrokeOrderCache(client as never, storage);
    await cache.get('学');
    await expect(cache.get('学')).rejects.toMatchObject({category: 'network_unavailable'});
    expect(await storage.getItem('orena.reference.stroke.v1:%E5%AD%A6')).toBeNull();

    const cachedClient = {getChineseStrokeOrder: jest.fn()
      .mockResolvedValueOnce({kind: 'fresh', data, etag: '"v1"', cacheControl: 'public, max-age=31536000, immutable'})
      .mockRejectedValueOnce(new ApiError('timeout', 'slow'))};
    const cached = new StrokeOrderCache(cachedClient as never, new MemoryKeyValueStorage());
    await cached.get('学');
    await expect(cached.get('学')).resolves.toMatchObject({freshness: 'stale', fromCache: true});
  });

  it.each([null, 'public, max-age=60', 'private, max-age=31536000, immutable'])('does not cache responses without the immutable public policy (%s)', async (cacheControl) => {
    const client = {getChineseStrokeOrder: jest.fn().mockResolvedValue({kind: 'fresh', data, etag: '"v1"', cacheControl})};
    const storage = new MemoryKeyValueStorage();
    await new StrokeOrderCache(client as never, storage).get('学');
    expect(await storage.getItem('orena.reference.stroke.v1:%E5%AD%A6')).toBeNull();
  });

  it('keeps the persisted cache index bounded across cache instances', async () => {
    const storage = new MemoryKeyValueStorage();
    const client = {getChineseStrokeOrder: jest.fn().mockImplementation(async (word: string) => ({kind: 'fresh', data: {...data, word}, etag: `"${word}"`, cacheControl: 'public, max-age=31536000, immutable'}))};
    for (let i = 0; i < 14; i += 1) await new StrokeOrderCache(client as never, storage).get(`学${String.fromCharCode(0x4e00 + i)}`);
    const index = JSON.parse((await storage.getItem('orena.reference.stroke.index.v1')) ?? '[]') as unknown[];
    expect(index).toHaveLength(12);
  });
});

import {ApiClient, type RequestOptions} from './client';
import {strokeOrderSchema, type StrokeOrder} from './contracts/reference';
import {ApiError} from './errors';
import type {KeyValueStorage} from '../storage/boundedCache';

type CacheRecord = {
  word: string;
  data: StrokeOrder;
  sourceVersion: string;
  etag: string;
};

const CACHE_PREFIX = 'orena.reference.stroke.v1:';
const CACHE_INDEX_KEY = 'orena.reference.stroke.index.v1';
const MAX_ENTRIES = 12;

export type ReferenceResult = {
  data: StrokeOrder;
  sourceVersion: string;
  etag: string;
  freshness: 'fresh' | 'stale';
  fromCache: boolean;
};

export class StrokeOrderCache {
  constructor(private readonly client: ApiClient, private readonly storage: KeyValueStorage) {}

  async get(word: string, options: RequestOptions = {}): Promise<ReferenceResult> {
    const key = this.key(word);
    const cached = await this.read(key, word);
    try {
      const response = await this.client.getChineseStrokeOrder(word, {...options, ifNoneMatch: cached?.etag});
      if (response.kind === 'not_modified') {
        if (!cached || cached.etag !== response.etag) throw new ApiError('invalid_response', 'Reference cache validation failed', 304);
        return {...cached, freshness: 'fresh', fromCache: true};
      }
      const result: ReferenceResult = {
        data: response.data,
        sourceVersion: response.data.source_version,
        etag: response.etag ?? '',
        freshness: 'fresh',
        fromCache: false,
      };
      if (response.etag && this.isImmutable(response.cacheControl)) await this.write(key, {...result, word});
      else await this.remove(key);
      return result;
    } catch (error) {
      if (cached && error instanceof ApiError && ['network_unavailable', 'timeout', 'server_unavailable'].includes(error.category)) {
        return {...cached, freshness: 'stale', fromCache: true};
      }
      throw error;
    }
  }

  private key(word: string): string {
    return `${CACHE_PREFIX}${encodeURIComponent(word)}`;
  }

  private isImmutable(cacheControl: string | null): boolean {
    const directives = (cacheControl ?? '').toLowerCase().split(',').map((part) => part.trim());
    const maxAge = Number(directives.find((part) => part.startsWith('max-age='))?.slice(8));
    return directives.includes('public') && directives.includes('immutable') && Number.isFinite(maxAge) && maxAge >= 31536000;
  }

  private async read(key: string, word: string): Promise<ReferenceResult | null> {
    const raw = await this.storage.getItem(key);
    if (!raw) return null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('invalid cache');
      const record = parsed as Partial<CacheRecord>;
      if (record.word !== word || typeof record.sourceVersion !== 'string' || typeof record.etag !== 'string') throw new Error('invalid cache');
      const data = strokeOrderSchema.parse(record.data);
      if (record.sourceVersion !== data.source_version || record.etag === '') throw new Error('invalid cache');
      return {data, sourceVersion: record.sourceVersion, etag: record.etag, freshness: 'stale', fromCache: true};
    } catch {
      await this.remove(key);
      return null;
    }
  }

  private async write(key: string, result: ReferenceResult & {word: string}): Promise<void> {
    await this.storage.setItem(key, JSON.stringify({word: result.word, data: result.data, sourceVersion: result.sourceVersion, etag: result.etag} satisfies CacheRecord));
    const keys = (await this.readIndex()).filter((item) => item !== key);
    keys.push(key);
    while (keys.length > MAX_ENTRIES) {
      const oldest = keys.shift();
      if (oldest) await this.storage.removeItem(oldest);
    }
    await this.writeIndex(keys);
  }

  private async remove(key: string): Promise<void> {
    await this.storage.removeItem(key);
    await this.writeIndex((await this.readIndex()).filter((item) => item !== key));
  }

  private async readIndex(): Promise<string[]> {
    const raw = await this.storage.getItem(CACHE_INDEX_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error('invalid cache index');
      return parsed.filter((item): item is string => typeof item === 'string' && item.startsWith(CACHE_PREFIX));
    } catch {
      await this.storage.removeItem(CACHE_INDEX_KEY);
      return [];
    }
  }

  private async writeIndex(keys: string[]): Promise<void> {
    await this.storage.setItem(CACHE_INDEX_KEY, JSON.stringify(keys.slice(-MAX_ENTRIES)));
  }
}

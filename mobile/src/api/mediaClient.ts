import {ApiClient, type RequestOptions} from './client';
import {ApiError} from './errors';
import {compactMediaStatusSchema, type CompactMediaStatus} from './contracts/reference';
import type {KeyValueStorage} from '../storage/boundedCache';
import {z} from 'zod';

export const resumeStateSchema = z.object({
  assetId: z.string().min(1).max(128),
  resumeHandle: z.string().min(20).max(200),
  status: z.enum(['processing', 'ready', 'failed']),
  resumable: z.boolean(),
}).strict();

export type ResumeState = z.infer<typeof resumeStateSchema>;
export type ResumeResult = {state: ResumeState | null; freshness: 'fresh' | 'stale' | 'unavailable'; error?: ApiError};

const RESUME_KEY = 'orena.media.resume.v1';

export function resumeStateFromStatus(status: CompactMediaStatus): ResumeState {
  return resumeStateSchema.parse({
    assetId: status.asset.asset_id,
    resumeHandle: status.import_job.resume_handle,
    status: status.status,
    resumable: status.import_job.resumable && status.status === 'processing',
  });
}

export class MediaResumeStore {
  constructor(private readonly client: ApiClient, private readonly storage: KeyValueStorage) {}

  async revalidate(resumeHandle: string, options: RequestOptions = {}): Promise<ResumeResult> {
    try {
      const status = compactMediaStatusSchema.parse(await this.client.getMediaImportStatus(resumeHandle, options));
      const state = resumeStateFromStatus(status);
      await this.storage.setItem(RESUME_KEY, JSON.stringify(state));
      return {state, freshness: 'fresh'};
    } catch (error) {
      const stale = await this.read();
      if (stale && error instanceof ApiError && ['network_unavailable', 'timeout', 'server_unavailable'].includes(error.category)) {
        return {state: stale, freshness: 'stale', error};
      }
      await this.storage.removeItem(RESUME_KEY);
      return {state: null, freshness: 'unavailable', error: error instanceof ApiError ? error : undefined};
    }
  }

  async read(): Promise<ResumeState | null> {
    const raw = await this.storage.getItem(RESUME_KEY);
    if (!raw) return null;
    try { return resumeStateSchema.parse(JSON.parse(raw)); }
    catch { await this.storage.removeItem(RESUME_KEY); return null; }
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(RESUME_KEY);
  }
}

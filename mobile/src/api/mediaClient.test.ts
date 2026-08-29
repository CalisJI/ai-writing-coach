import {ApiError} from './errors';
import {MediaResumeStore, resumeStateFromStatus} from './mediaClient';
import {MemoryKeyValueStorage} from '../storage/boundedCache';

const status = {status: 'processing' as const, asset: {asset_id: 'youtube:fixture', processing_state: 'processing' as const}, import_job: {resume_handle: 'opaque-resume-handle-123456', state: 'queued', source: 'supadata', failure_kind: null, resumable: true}};

describe('canonical media resume identity', () => {
  it('keeps only server asset and opaque resume identifiers', () => {
    expect(resumeStateFromStatus({...status, transcript: 'must not persist'} as never)).toEqual({assetId: 'youtube:fixture', resumeHandle: 'opaque-resume-handle-123456', status: 'processing', resumable: true});
  });

  it('returns safe stale state on offline revalidation and clears it on rejected status', async () => {
    const client = {getMediaImportStatus: jest.fn()
      .mockResolvedValueOnce(status)
      .mockRejectedValueOnce(new ApiError('network_unavailable', 'offline'))
      .mockRejectedValueOnce(new ApiError('request_rejected', 'gone'))};
    const storage = new MemoryKeyValueStorage();
    const store = new MediaResumeStore(client as never, storage);
    await expect(store.revalidate(status.import_job.resume_handle)).resolves.toMatchObject({freshness: 'fresh', state: {assetId: 'youtube:fixture'}});
    await expect(store.revalidate(status.import_job.resume_handle)).resolves.toMatchObject({freshness: 'stale', state: {resumeHandle: status.import_job.resume_handle}});
    await expect(store.revalidate(status.import_job.resume_handle)).resolves.toMatchObject({freshness: 'unavailable', state: null, error: {category: 'request_rejected'}});
    expect(await store.read()).toBeNull();
  });
});

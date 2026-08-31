import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

describe('mobile store artifact encoding', () => {
  it('preserves the UTF-8 Chinese store description', () => {
    const metadata = readFileSync(resolve(__dirname, '../../docs/project/MOBILE_STORE_METADATA.md'), 'utf8');
    expect(metadata).toContain('- Short description (ZH): 使用服务器确认的学习证据，练习写作、阅读、听力、口语和语法。');
    expect(metadata).not.toMatch(/Short description \(ZH\):.*\?{2,}/);
  });
});

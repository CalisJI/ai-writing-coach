import {cp, mkdtemp, readdir, rm, symlink} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawn} from 'node:child_process';

const source = resolve(process.cwd());
const expoCli = join(source, 'node_modules', 'expo', 'bin', 'cli');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'orena-prebuild-'));
const ignoredNames = new Set(['node_modules', '.expo', 'android', 'ios', 'dist', 'web-build']);

const run = (platform) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, [expoCli, 'prebuild', '--no-install', '--platform', platform], {
    cwd: temporaryRoot,
    env: {
      ...process.env,
      EXPO_HOME: join(temporaryRoot, '.expo'),
      __UNSAFE_EXPO_HOME_DIRECTORY: join(temporaryRoot, '.expo'),
      npm_config_cache: join(temporaryRoot, '.npm-cache'),
    },
    stdio: 'inherit',
    shell: false,
  });
  child.once('error', rejectRun);
  child.once('exit', (code, signal) => {
    if (code === 0) resolveRun();
    else rejectRun(new Error(`Expo ${platform} prebuild exited with ${code ?? `signal ${signal}`}`));
  });
});

try {
  await cp(source, temporaryRoot, {
    recursive: true,
    filter: (sourcePath) => {
      const name = sourcePath.split(/[\\/]/).pop() ?? '';
      if (ignoredNames.has(name)) return false;
      return name !== '.env' && !(name.startsWith('.env.') && name !== '.env.example');
    },
  });
  const sourceNodeModules = join(source, 'node_modules');
  if (!existsSync(sourceNodeModules)) throw new Error('mobile/node_modules is required; run npm ci first');
  await symlink(sourceNodeModules, join(temporaryRoot, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');

  const platforms = process.platform === 'win32' ? ['android'] : ['android', 'ios'];
  for (const platform of platforms) {
    await run(platform);
    const generated = await readdir(join(temporaryRoot, platform)).catch(() => null);
    if (!generated || generated.length === 0) throw new Error(`Expo ${platform} prebuild produced no native project`);
    console.log(`Expo ${platform} prebuild validation passed (temporary output).`);
    await rm(join(temporaryRoot, platform), {recursive: true, force: true});
  }
  if (!platforms.includes('ios')) {
    console.log('Expo ios prebuild validation deferred on Windows; CI runs both platforms on Linux.');
  }
} finally {
  await rm(join(temporaryRoot, 'node_modules'), {force: true}).catch(() => undefined);
  await rm(temporaryRoot, {recursive: true, force: true, maxRetries: 10, retryDelay: 250});
}

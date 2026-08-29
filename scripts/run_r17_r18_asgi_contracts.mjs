import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const commands = [
  ['--profile', 'test', 'build', 'writing-coach'],
  ['--profile', 'test', 'build', 'writing-coach-tests'],
  ['--profile', 'test', 'run', '--rm', '--no-deps', 'writing-coach-tests'],
];

for (const args of commands) {
  const result = spawnSync('docker', ['compose', ...args], {stdio: 'inherit'});
  assert.equal(result.status, 0, `docker compose ${args.join(' ')} failed`);
}

console.log('R17/R18 ASGI contract suite: PASS');

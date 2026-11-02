import { spawnSync } from 'node:child_process';

// Browser tests intentionally exercise the trial build; production defaults to locked.
const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(executable, ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, GARAGE_VFX_RELEASE_MODE: 'trial' },
});
process.exit(result.status ?? 1);

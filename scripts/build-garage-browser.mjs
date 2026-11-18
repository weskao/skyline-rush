import { spawnSync } from 'node:child_process';

// The regular browser suite exercises offline trial flows. The cloud suite uses Firebase emulators.
const executable = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(executable, ['run', 'build'], {
  stdio: 'inherit',
  env: { ...process.env, GARAGE_VFX_RELEASE_MODE: 'trial', VITE_WAVE3_FIRESTORE_PREVIEW: '0' },
});
process.exit(result.status ?? 1);

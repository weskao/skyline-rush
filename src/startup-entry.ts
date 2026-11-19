import { startup } from './startup-screen.ts';

void import('./main.js').catch((error: unknown) => {
  startup.fail('module');
  console.error('Game startup failed:', error);
});

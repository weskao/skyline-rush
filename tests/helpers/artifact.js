import { existsSync } from 'node:fs';

// The live 3D scene renders differently every run, so committed images are only rewritten when missing or with UPDATE_ARTIFACTS=1.
export const saveArtifact = async (page, options) => {
  if (process.env.UPDATE_ARTIFACTS || !existsSync(options.path)) await page.screenshot(options);
};

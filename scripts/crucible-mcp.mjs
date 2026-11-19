#!/usr/bin/env node
// Starts the installed Crucible MCP server on this checkout: its flags take absolute folders only.
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const at = path => fileURLToPath(new URL(`../${path}`, import.meta.url));
const models = at('public/models');
const assets = at('artifacts/crucible/assets');
// A job store has one live owner, so each server gets its own; several sessions share a checkout.
const jobs = at(`artifacts/crucible/jobs/${Date.now().toString(36)}`);
mkdirSync(assets, { recursive: true });
mkdirSync(jobs, { recursive: true });

// The catalog lists only files directly inside its folder, and each model has its own folder.
for (const file of readdirSync(models, { recursive: true })) {
  if (!file.endsWith('.glb')) continue;
  const from = join(models, file), to = join(assets, basename(file));
  const source = statSync(from), copy = statSync(to, { throwIfNoEntry: false });
  if (!copy || copy.size !== source.size || copy.mtimeMs < source.mtimeMs) copyFileSync(from, to);
}

process.argv.push('--assets', assets, '--jobs', jobs);
await import('../node_modules/crucible/bin/crucible-mcp.mjs');

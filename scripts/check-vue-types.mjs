// Validate every Vue script with Vue's SFC compiler and TypeScript parser.
// This is a syntax/transpile gate; semantic template checking additionally
// requires vue-tsc. Never present this check alone as full Vue type coverage.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse, compileScript } from '@vue/compiler-sfc';
import ts from 'typescript';

const root = new URL('../src/', import.meta.url);
const failures = [];
for (const file of readdirSync(root).filter(name => name.endsWith('.vue'))) {
  const contents = readFileSync(new URL(file, root), 'utf8');
  const result = parse(contents, { filename: file });
  if (result.errors.length) {
    failures.push(file + ': ' + result.errors.map(String).join('; '));
    continue;
  }
  const setup = result.descriptor.scriptSetup;
  if (!setup || setup.lang !== 'ts') {
    failures.push(file + ': expected <script setup lang="ts">');
    continue;
  }
  try {
    compileScript(result.descriptor, { id: file });
    const parsed = ts.transpileModule(setup.content, {
      fileName: file + '.ts',
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    });
    failures.push(...(parsed.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error)
      .map(d => file + ': ' + ts.flattenDiagnosticMessageText(d.messageText, '\n')));
  } catch (error) {
    failures.push(file + ': ' + error.message);
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Vue SFC TypeScript syntax verified (semantic template check is separate).');
}

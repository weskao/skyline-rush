import { appendFileSync } from 'node:fs';
import { relative } from 'node:path';

// A test that creeps toward its timeout passes until the day a slower runner tips it over: ring-sfx took 55 s, then
// 90 s, then timed out at 135 s on four attempts (CI 42489399352). Flag every test that used more than half its own
// budget (test.setTimeout included) as a GitHub warning and in the job summary, so the drift shows on green runs.
export const NEAR_BUDGET = 0.5;

export const nearBudget = (test, result) => test.timeout > 0 && result.duration > test.timeout * NEAR_BUDGET;

export function budgetWarning(test, result, root = process.cwd()) {
  const file = relative(root, test.location.file), title = test.titlePath().filter(Boolean).slice(1).join(' › ');
  const used = `${(result.duration / 1000).toFixed(1)} s of ${(test.timeout / 1000).toFixed(0)} s (${Math.round(100 * result.duration / test.timeout)}%)`;
  return { file, line: test.location.line, title, used, status: result.status };
}

export default class BudgetReporter {
  rows = [];
  printsToStdio() { return false; }
  onTestEnd(test, result) {
    if (!nearBudget(test, result)) return;
    const row = budgetWarning(test, result);
    this.rows.push(row);
    console.log(`::warning file=${row.file},line=${row.line},title=Near its test timeout::${row.title}: ${row.used}, ${row.status}`);
  }
  onEnd() {
    const summary = process.env.GITHUB_STEP_SUMMARY;
    if (!summary || !this.rows.length) return;
    appendFileSync(summary, ['### Browser tests near their timeout (> 50% of budget)', '', '| Test | Used | Status |', '| --- | --- | --- |',
      ...this.rows.map(row => `| \`${row.file}:${row.line}\` ${row.title.replaceAll('|', '\\|')} | ${row.used} | ${row.status} |`), ''].join('\n'));
  }
}

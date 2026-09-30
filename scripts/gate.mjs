// Every check CI runs, before a push. CI runs them as parallel jobs; this runs them in lanes side
// by side, and at the end prints the output of whatever failed. Within a lane the checks run in
// turn, and the end-to-end suite runs only if the build it tests succeeded. The browser suite waits
// for the unit tests: run together on one machine, each slowed the other past its timeouts.
import { spawn } from 'node:child_process';

const PHASES = [
  [
    { checks: ['lint', 'format:check', 'typecheck'] },
    { checks: ['validate:data', 'check:derived'] },
    { checks: ['test:coverage'] },
  ],
  [{ checks: ['build', 'e2e'], stopOnFailure: true }],
];

function run(script) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('npm', ['run', '--silent', script], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => {
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`${code === 0 ? 'ok  ' : 'FAIL'} ${script} (${seconds}s)`);
      resolve({ script, code, output });
    });
  });
}

async function lane({ checks, stopOnFailure = false }) {
  const results = [];
  for (const script of checks) {
    const result = await run(script);
    results.push(result);
    if (result.code !== 0 && stopOnFailure) break;
  }
  return results;
}

const started = Date.now();
const results = [];
for (const lanes of PHASES) results.push(...(await Promise.all(lanes.map(lane))).flat());
const failed = results.filter((r) => r.code !== 0);
for (const { script, output } of failed) console.log(`\n----- ${script} -----\n${output}`);
const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(failed.length ? `\nGate failed in ${seconds}s.` : `\nGate passed in ${seconds}s.`);
process.exit(failed.length ? 1 : 0);

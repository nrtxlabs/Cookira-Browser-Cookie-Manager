import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const npmExec = process.env.npm_execpath;
const steps = ['typecheck', 'test', 'build', 'test:e2e'];

for (const script of steps) {
  console.log(`\n=== Running npm run ${script} ===`);
  const result = npmExec
    ? spawnSync(process.execPath, [npmExec, 'run', script], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      })
    : spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'npm', process.platform === 'win32' ? ['/c', 'npm', 'run', script] : ['run', script], {
        cwd: ROOT_DIR,
        stdio: 'inherit',
      });
  if (result.status !== 0) {
    console.error(`\n[Verify Failed] Step "${script}" exited with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\n[Verify Passed] All typecheck, unit tests, dual builds, and browser E2E checks succeeded.');

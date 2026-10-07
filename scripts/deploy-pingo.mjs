import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const environment = process.argv[2];
if (environment !== 'dev' && environment !== 'prod') throw new Error('Expected dev or prod.');
const project = environment === 'dev' ? 'pingo-dev' : 'pingo';
const config = JSON.parse(readFileSync(join(root, 'pingo', environment, 'wrangler.jsonc'), 'utf8'));
const output = join(root, 'build', 'pingo');
const temporary = mkdtempSync(join(tmpdir(), 'pingo-pages-'));
try {
  config.pages_build_output_dir = output;
  writeFileSync(join(temporary, 'wrangler.jsonc'), JSON.stringify(config, null, 2));
  const result = spawnSync(process.execPath, [
    join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    'pages', 'deploy', output, '--project-name', project, '--branch', 'main'
  ], { cwd: temporary, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

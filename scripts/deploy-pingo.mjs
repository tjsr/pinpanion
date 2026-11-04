import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const environment = process.argv[2];
if (environment !== 'dev' && environment !== 'prod') throw new Error('Expected dev or prod.');
const project = environment === 'dev' ? 'pingo-dev' : 'pingo';
const output = '../../build/pingo';
const result = spawnSync(process.execPath, [
  join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  'pages', 'deploy', output, '--project-name', project, '--branch', 'main'
], { cwd: join(root, 'pingo', environment), stdio: 'inherit', env: process.env });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;

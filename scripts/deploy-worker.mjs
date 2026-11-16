import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const environment = process.argv[2];
if (environment !== 'dev' && environment !== 'prod') throw new Error('Expected dev or prod.');
const databaseIdVariable = environment === 'dev'
  ? 'PINPANION_DEV_LANYARDS_D1_DATABASE_ID'
  : 'PINPANION_PROD_LANYARDS_D1_DATABASE_ID';
const databaseId = process.env[databaseIdVariable];
if (!databaseId) throw new Error(`Set ${databaseIdVariable} before deploying the Pinpanion Worker.`);

const config = JSON.parse(readFileSync(join(root, 'wrangler.jsonc'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/,(\s*[}\]])/g, '$1'));
const temporary = mkdtempSync(join(tmpdir(), 'pinpanion-worker-'));
try {
  config.env[environment].d1_databases[0].database_id = databaseId;
  writeFileSync(join(temporary, 'wrangler.jsonc'), JSON.stringify(config, null, 2));
  const result = spawnSync(process.execPath, [
    join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
    'deploy', '--config', join(temporary, 'wrangler.jsonc'), '--env', environment,
  ], { cwd: root, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

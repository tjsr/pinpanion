import { copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const response = await fetch('https://pinpanion.com/pins.json');
if (!response.ok) throw new Error(`Pinpanion pin feed returned ${response.status}`);
const feed = await response.json();
if (!Array.isArray(feed.pins) || feed.pins.length < 25) {
  throw new Error('Pinpanion pin feed contains fewer than 25 pins');
}
await writeFile(path.resolve('build/pingo/pins.json'), JSON.stringify(feed));
await copyFile(path.resolve('build/pingo/index.html'), path.resolve('build/pingo/shell.html'));
await writeFile(path.resolve('build/pingo/_routes.json'), JSON.stringify({
  version: 1,
  include: ['/*'],
  exclude: ['/assets/*', '/pins.json', '/index.html', '/shell.html', '/favicon.ico']
}, null, 2));
console.log(`Prepared Pingo with ${feed.pins.length} catalog entries from pinpanion.com`);

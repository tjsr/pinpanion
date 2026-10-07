import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const response = await fetch('https://pinpanion.com/pins.json');
if (!response.ok) throw new Error(`Pinpanion pin feed returned ${response.status}`);
const feed = await response.json();
if (!Array.isArray(feed.pins) || feed.pins.length < 24) {
  throw new Error('Pinpanion pin feed contains fewer than 24 pins');
}

const output = path.resolve('build/guess');
await writeFile(path.join(output, 'pins.json'), JSON.stringify(feed));
await writeFile(path.join(output, '_redirects'), '/* /index.html 200\n');
console.log(`Prepared Guess Who with ${feed.pins.length} pins from pinpanion.com`);

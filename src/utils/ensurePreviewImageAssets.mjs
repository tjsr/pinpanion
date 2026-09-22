import { existsSync, promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dataFile = path.join(projectRoot, 'public', 'pins.json');
const imageDirectory = path.join(projectRoot, 'public', 'imgs');
const verificationFile = path.join(imageDirectory, '.preview-image-assets.json');

const downloadImages = () =>
  new Promise((resolve, reject) => {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const downloadArguments = ['run', 'download', '--', 'public/imgs'];
    const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : npm;
    const argumentsToUse = process.platform === 'win32'
      ? ['/d', '/s', '/c', `${npm} ${downloadArguments.join(' ')}`]
      : downloadArguments;
    const downloader = spawn(command, argumentsToUse, {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env, IMAGE_DOWNLOAD_CONCURRENCY: '20' },
    });

    downloader.on('error', reject);
    downloader.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Image download failed with exit code ${code}.`));
      }
    });
  });

const readExpectedImageNames = async () => {
  const data = JSON.parse(await fs.readFile(dataFile, 'utf8'));
  return [...new Set(data.pins.map((pin) => pin.image_name).filter(Boolean))];
};

const findMissingImages = async (imageNames) => {
  const present = await Promise.all(
    imageNames.map(async (imageName) => ({
      imageName,
      exists: existsSync(path.join(imageDirectory, imageName)),
    }))
  );
  return present.filter(({ exists }) => !exists).map(({ imageName }) => imageName);
};

const assetsNeedRefresh = async () => {
  if (!existsSync(dataFile) || !existsSync(imageDirectory) || !existsSync(verificationFile)) {
    return { needsRefresh: true, reason: 'the image cache has not been verified' };
  }

  const [dataStats, verificationStats, imageNames] = await Promise.all([
    fs.stat(dataFile),
    fs.stat(verificationFile),
    readExpectedImageNames(),
  ]);
  const missingImages = await findMissingImages(imageNames);

  if (missingImages.length > 0) {
    return { needsRefresh: true, reason: `${missingImages.length} image asset(s) are missing` };
  }

  if (dataStats.mtimeMs > verificationStats.mtimeMs) {
    return { needsRefresh: true, reason: 'the cached pin data is newer than the image assets' };
  }

  return { needsRefresh: false };
};

const writeVerification = async () => {
  await fs.mkdir(imageDirectory, { recursive: true });
  await fs.writeFile(verificationFile, `${JSON.stringify({ verifiedAt: new Date().toISOString() })}\n`);
};

const status = await assetsNeedRefresh();
if (status.needsRefresh) {
  console.log(`Refreshing preview image assets because ${status.reason}.`);
  await downloadImages();
  const missingImages = await findMissingImages(await readExpectedImageNames());
  if (missingImages.length > 0) {
    throw new Error(`Image download completed but ${missingImages.length} image asset(s) are still missing.`);
  }
  await writeVerification();
} else {
  console.log('Preview image assets are current.');
}

import { program } from "commander";
import { writeFile } from 'fs/promises';

// https://api.pinnypals.com/api/version gives latest version

interface SchemaToolCommandOptions {
  latest: boolean;
  version: string;
  host: string;
  path: string;
}

async function downloadFile(url: string, outputPath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  await writeFile(outputPath, Buffer.from(arrayBuffer));
}

program
  .description('Pinnypals schema downloader')
  .option('-l, --latest', 'Get the latest version from the server')
  .option('-v, --version <version>', 'Get API of version')
  .option('-h, --host <host>', 'Host URL', 'https://api.pinnypals.com/')
  .option('-p, --path <path>', 'Schema file output path', './src/pinnypals')
  .action(async (options: SchemaToolCommandOptions, _command) => {
    let version: string | undefined;
    if (options.version) {
      if (options.latest) {
        console.error('Cannot specify both --latest and --version');
        process.exit(1);
      }
      version = options.version;
      console.log(`Using specified version ${version}`);
    } else {
      const versionUrl = options.host + '/api/version';
      const response = await fetch(versionUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${versionUrl}: ${response.status} ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const json = JSON.parse(Buffer.from(arrayBuffer).toString('utf-8'));
      version = json.version;
      // Get the latest version from the server
      console.log(`Latest version returned from /api/version is ${version}`);
    }

    const schemaFileName = `pinnypals-openapi-${version}-public.json`;
    const url = `${options.host}/${schemaFileName}`;
    const outputPath = options.version
      ? `${options.path}/${schemaFileName}`
      : `${options.path}/pinnypals-openapi-latest-public.json`;
    downloadFile(url, outputPath)
      .then(() => console.log(`Downloaded ${url} to ${outputPath}`))
      .catch((err) => {
        console.error('Error:', err.message);
        process.exit(1);
      });
  });

await program.parseAsync(process.argv);

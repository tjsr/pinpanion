import os from 'node:os';

const isWindows = (): boolean => {
  return process.platform === 'win32';
};

const getMaxPathLength = (outputPath: string): number => {
  const platform = os.platform();
  if (platform === 'win32') {
    // Check if the path uses the extended-length prefix
    if (outputPath.startsWith('\\\\?\\')) {
      return 32767;
    }
    return 260;
  } else {
    return 4096;
  }
};

export class InvalidPathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPathError';
  }
}

export const isValidNixPath = (outputPath: string): boolean => !/[<>:"|?*]/.test(outputPath);

export const isValidWin32Path = (outputPath: string): boolean => outputPath.indexOf(':') == 1 &&
  !/[<>:"|?*]/.test(outputPath.substring(outputPath.indexOf(':') + 1)) ||
  !/[<>:"|?*]/.test(outputPath);

export const validateOutputPath = (outputPath: string, win32: boolean|undefined = undefined): void => {
  const maxPathLength = getMaxPathLength(outputPath);
  if (typeof outputPath !== 'string' || outputPath.length > (maxPathLength - 12)) {
    throw new InvalidPathError(`Path ${outputPath} is too long.`);
  }

  if (win32 === true || (win32 === undefined && isWindows())) {
    if (!isValidWin32Path(outputPath)) {
      throw new InvalidPathError(
        `Target output path ${outputPath} contains invalid characters for Windows filesystems.`
      );
    }
  } else if (!isValidNixPath(outputPath)) {
    throw new InvalidPathError(`Target output path ${outputPath} contains invalid characters for *nix filesystems.`);
  }
};

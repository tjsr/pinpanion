import { isValidNixPath, isValidWin32Path, validateOutputPath } from './pathUtils.js';

import os from 'node:os';
import path from 'node:path';

describe('pathUtils', () => {
  it('Should reject a path that contains a portion of a URL regardless of host platform', () => {
    const testOutputBase = os.tmpdir();

    const joinedInvalidPath = `${testOutputBase}/http:/test`;
    expect(() => {
      validateOutputPath(joinedInvalidPath);
    }).toThrowError(new RegExp(
      `Target output path ${joinedInvalidPath.replace(/\\/g, '\\\\')} contains invalid characters.*`,
      'g'));
  });

  it('Should reject a path that contains a portion of a URL when Windows specified', () => {
    const testOutputBase = os.tmpdir();

    const joinedInvalidPath = `${testOutputBase}/http:/test`;
    expect(() => {
      validateOutputPath(joinedInvalidPath, true);
    }).toThrowError(new RegExp(
      `Target output path ${joinedInvalidPath.replace(/\\/g, '\\\\')} contains invalid characters.*`,
      'g'));
  });

  it('Should reject a path that contains a portion of a URL when nix specified', () => {
    const testOutputBase = os.tmpdir();

    const joinedInvalidPath = `${testOutputBase}/http:/test`;
    expect(() => {
      validateOutputPath(joinedInvalidPath, false);
    }).toThrowError(new RegExp(
      `Target output path ${joinedInvalidPath.replace(/\\/g, '\\\\')} contains invalid characters.*`,
      'g'));
  });

  it('Should accept a Windows file path that is valid but does not exist', () => {
    const testPath = path.join('C:', 'temp', 'blahblalfoo.json');
    expect(() => {
      validateOutputPath(testPath, true);
    }).not.toThrow();
  });

  it('Should reject a Windows file path check checking for validity on nix systems', () => {
    const testPath = path.join('C:', 'temp', 'blahblalfoo.json');
    expect(() => {
      validateOutputPath(testPath, false);
    }).toThrowError(`Target output path ${testPath} contains invalid characters for *nix filesystems.`);
  });
});

describe('isValidNixPath', () => {
  it('Should reject a path that contains a portion of a URL', () => {
    const testOutputBase = os.tmpdir();

    const invalidPath = `${testOutputBase}/http:/test`;
    expect(isValidNixPath(invalidPath)).toEqual(false);
  });

  it('Should reject a path containing a drive letter that would be valid on Windows.', () => {
    const testPath = path.join('C:', 'temp', 'blahblalfoo.json');
    expect(isValidNixPath(testPath)).toEqual(false);
  });

  it('Should accept a top-level path for validity on nix systems', () => {
    const testPath = path.join('/', 'temp', 'blahblalfoo.json');
    expect(isValidNixPath(testPath)).toEqual(true);
  });
});


describe('isValidWin32Path', () => {
  it('Should reject a path that contains a portion of a URL regardless of plaform', () => {
    const testOutputBase = os.tmpdir();

    const invalidPath = `${testOutputBase}/http:/test`;
    expect(isValidWin32Path(invalidPath)).toEqual(false);
  });

  it('Should reject a path that contains a portion of a URL when assuming a Win32 path', () => {
    const invalidPath = `C:\\temp\\http:/test`;
    expect(isValidWin32Path(invalidPath)).toEqual(false);
  });

  it('Should reject a path that contains a portion of a URL when assuming a nix path', () => {
    const invalidPath = `/var/tmp/http:/test`;
    expect(isValidWin32Path(invalidPath)).toEqual(false);
  });

  it('Should accept a path with a drive letter that would be valid on Windows.', () => {
    const testPath = path.join('C:', 'temp', 'blahblalfoo.json');
    expect(isValidWin32Path(testPath)).toEqual(true);
  });


  it('Should accept a top-level path on Windows', () => {
    const testPath = path.join('/', 'temp', 'blahblalfoo.json');
    expect(isValidWin32Path(testPath)).toEqual(true);
  });
});

import type { Config } from 'jest';

const config: Config = {
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/test/mocks/styleMock.ts',
  },
  preset: 'ts-jest',
  testEnvironment: 'node',
  verbose: true,
};

export default config;

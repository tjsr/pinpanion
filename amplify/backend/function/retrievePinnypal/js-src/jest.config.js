import type { Config } from 'jest';

const config: Config = {
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/test/mocks/styleMock.js',
  },
  preset: 'jest',
  testEnvironment: 'node',
  verbose: true,
};

export default config;

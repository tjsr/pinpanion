import type { Config } from 'jest';

const config: Config = {
  moduleNameMapper: {
    '\\.(css|less)$': '<rootDir>/test/mocks/styleMock.ts',
  },
  modulePathIgnorePatterns: ['amplify'],
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  verbose: true,
};

export default config;

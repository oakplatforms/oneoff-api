import { config } from 'dotenv'
config({ path: '.env.test' })

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  globalSetup: './jest.global-setup.ts',
  globalTeardown: './jest.global-teardown.ts',
  setupFilesAfterEnv: ['./jest.setup.ts'],
  maxWorkers: 1,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/api/',
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
}
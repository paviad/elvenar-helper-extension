/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Use 'jsdom' if you are testing frontend browser code
  transform: {
    // This tells Jest to use ts-jest and explicitly points to your config file
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.jest.json',
        isolatedModules: true, // <--- ADD THIS LINE
      },
    ],
  },
  // Ignore compiled JS files so Jest doesn't run tests twice
  testPathIgnorePatterns: ['/node_modules/', '/build-jest/', '/dist/', '/build/'],
};

/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testRegex: '/test/.+test.ts?$',
  testEnvironment: 'node',
  passWithNoTests: true,
  collectCoverageFrom: ['./src/**/*.ts'],
  coverageReporters: ['lcov', 'json-summary', ['text', { file: 'coverage.txt', path: './' }]],
  setupFiles: ['./jest.setup.js'],
}

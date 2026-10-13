import { switchReadingConfig } from './src/themes/typescript/eslint.ts'

// The samples opt into the reading contract; the renderer accepts arbitrary TS.
export default [{ ...switchReadingConfig, files: ['src/samples/**/*.ts'] }]

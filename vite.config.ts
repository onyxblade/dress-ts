import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'

export default defineConfig({
  // The demo is served from https://<user>.github.io/dress-ts/ by the Pages workflow.
  base: process.env.GITHUB_PAGES ? '/dress-ts/' : '/',
  plugins: [preact()],
  test: {
    environment: 'node',
  },
})

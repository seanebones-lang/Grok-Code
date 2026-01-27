/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import path from 'path'
import { cx } from 'class-variance-authority'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'clover', 'lcov'],
      include: [
        'src/**/*.{ts,tsx}',
      ],
      exclude: [
        'node_modules/',
        'src/**/*.config.ts',
        'src/**/*.d.ts',
        'src/types/',
        'src/__tests__/',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

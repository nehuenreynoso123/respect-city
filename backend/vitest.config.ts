import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Backend domain/application logic is pure TypeScript: no DOM needed.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
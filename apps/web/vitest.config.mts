import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Unit tests only — no jsdom, no React rendering.
 *
 * That is a deliberate scope, not a shortcut. The pure modules here (money
 * formatting, the offer index, location encoding) hold the logic where a mistake
 * is SILENT: a bill renders as ₹45 instead of ₹4,500 and nothing throws. Those are
 * worth locking down first and cost milliseconds to run.
 *
 * Component rendering is a separate, heavier decision — it needs jsdom, a testing
 * library, and mocks for `next/navigation` and the API client, and it tends to
 * assert on markup that changes every time the design does. The rendered-page
 * contract that actually mattered this week (exactly one h1, no horizontal
 * overflow) is checked against the REAL built app in html-contract.test.ts, which
 * is both cheaper and harder to fool than a jsdom render.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    // Mirrors tsconfig paths. Vitest does not read tsconfig for this.
    // `import.meta.dirname`, not `__dirname` — this file is ESM (.mts), and Vite's
    // native config loader warns on the CommonJS global.
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})

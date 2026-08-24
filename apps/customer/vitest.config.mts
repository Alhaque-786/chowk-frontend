import { defineConfig } from 'vitest/config'
import path from 'node:path'

/**
 * Unit tests for the app's PURE modules only.
 *
 * No component rendering, and that is a real boundary rather than laziness. Testing
 * a React Native component means jest-expo or a native preset, a renderer that does
 * not run the Reanimated worklets that are the actual behaviour on this screen, and
 * mocks for every expo-* module in the import graph. What you get back is an
 * assertion that a View exists — the animation, which is the part that broke four
 * times this week, is invisible to it.
 *
 * The host-resolution logic below is different: it is branching, platform-dependent,
 * and its failure mode is a 404 on every photograph. That is worth a test.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
})

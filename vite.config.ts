import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * The production Content-Security-Policy lives in `index.html` and is deliberately
 * strict: no inline scripts, no remote origins.
 *
 * The dev server cannot satisfy it. Vite injects an inline module preamble for React
 * Fast Refresh, serves styles as inline `<style>` tags before the CSS is extracted,
 * and opens a WebSocket for HMR. Rather than weakening the shipped policy to make
 * `vite dev` work, this plugin swaps in a dev-only policy that is still origin-locked
 * but permits those three things. Nothing here touches `vite build` output.
 */
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

function relaxCspForDev(): Plugin {
  return {
    name: 'thornfield:relax-csp-for-dev',
    apply: 'serve',
    transformIndexHtml: {
      order: 'pre',
      handler: (html) =>
        html.replace(
          /(<meta\s+http-equiv="Content-Security-Policy"\s+content=")[^"]*(")/i,
          `$1${DEV_CSP}$2`,
        ),
    },
  };
}

export default defineConfig({
  plugins: [react(), relaxCspForDev()],
  resolve: {
    alias: {
      // Mirrored by `paths` in tsconfig.app.json — keep the two in step.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    modulePreload: {
      /**
       * The polyfill is injected as an inline <script>, which the production CSP
       * in index.html forbids. Every browser in our `es2022` target supports
       * <link rel="modulepreload"> natively, so the polyfill buys nothing.
       */
      polyfill: false,
    },
  },
  css: {
    modules: {
      // Readable in devtools, hashed enough to stay collision-free.
      generateScopedName: '[name]__[local]__[hash:base64:5]',
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Process real CSS Modules so tests assert on the same class names as the browser.
    css: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/index.ts', 'src/test/**', 'src/main.tsx'],
    },
  },
});

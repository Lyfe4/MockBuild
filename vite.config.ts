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
  // No `frame-ancestors`: it is ignored in a <meta> tag and only produces a
  // console error saying so. It is served as a header from `public/_headers`.
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
    rolldownOptions: {
      output: {
        /**
         * Three named groups, split by **lifetime** rather than by route.
         *
         * Route-level splitting on its own already got the biggest chunk under
         * the 500 kB warning, but it left the shared remainder named after
         * whichever module happened to be first into it — a 399 kB chunk called
         * `hooks`, which is 399 kB of beetle. Naming the groups makes the build
         * output legible and, more usefully, gives each one a cache lifetime of
         * its own:
         *
         *   vendor   react, react-dom, react-router. Changes when a dependency
         *            is upgraded, which is rarely.
         *   plates   the eighteen generated `*.plate.ts` files. Changes when a
         *            drawing is redrawn, which is often — but only ever a few
         *            of them, and never together with the app code.
         *   records  the species records and the reference provenance. Changes
         *            when a specimen is accessioned.
         *
         * Without this, one edit to a component invalidates the beetles too.
         *
         * `plates` is deliberately *not* split per route, and it is worth
         * saying why rather than leaving it to look like an oversight. The
         * catalogue, the calendar and the key each draw every specimen in the
         * collection, so five of the eight routes need all eighteen plates;
         * splitting them per route would put the same data in five chunks and
         * download it five times. One shared chunk fetched in parallel with the
         * entry is the honest shape of that dependency.
         */
        advancedChunks: {
          // `[\\/]` in every separator: module ids are normalised to forward
          // slashes on posix and can arrive with backslashes on Windows, and a
          // group whose test silently matches nothing produces a build that is
          // merely worse rather than one that fails.
          groups: [
            {
              name: 'vendor',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            {
              // Both the eighteen generated drawings *and* the `plates.ts`
              // index that gathers them. Leaving the index out of this group
              // put it in `records`, which every route imports — so `records`
              // statically imported `plates` and the 258 kB came straight back
              // onto the critical path with the split apparently in place.
              name: 'plates',
              test: /[\\/]src[\\/]data[\\/]species[\\/]([^\\/]+\.plate\.ts|plates\.ts)$/,
            },
            { name: 'records', test: /[\\/]src[\\/]data[\\/](species|references)[\\/]/ },
          ],
        },
      },
    },
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
    /**
     * Well above vitest's 5 s default, and not because any test is slow.
     *
     * The heavy render tests — the contact sheet at three sizes, the calendar's
     * sixteen rows, the request form's `userEvent` typing — each take a few
     * hundred milliseconds alone. Run as part of the whole suite they share
     * cores with every other jsdom environment and cross five seconds on a
     * machine under load, so the suite failed on the run and passed on the
     * retry: the worst possible signal, since it teaches a reader to re-run a
     * red build instead of reading it.
     */
    testTimeout: 20_000,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
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

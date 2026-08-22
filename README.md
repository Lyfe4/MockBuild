# Thornfield Botanical Archive

A mock website for a fictional institution — a working seed bank and herbarium
in the temperate south. Thornfield keeps pressed specimens, accession records
and viable seed, and the site is meant to feel like the public face of a real
collection: quiet, archival, built around typography and paper rather than
imagery. Its one flourish is that the whole palette shifts with the season,
Southern Hemisphere, so the archive is dressed differently in July than in
January.

This repository is a portfolio piece. There is no real institution, no real
seed, and no data is collected from anyone who visits.

> **Status: scaffold.** Tooling, design tokens and the app shell are in place.
> The catalogue and specimen views are not built yet.

## Screenshot

<!-- Replace with a real capture once the catalogue view exists. -->

_Screenshot placeholder — `docs/screenshot.png`, 1600×1000, showing the
catalogue in autumn._

## Getting started

Requires Node 22 (see `.nvmrc`).

```bash
nvm use && npm install && npm run dev
```

## Scripts

| Script                  | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Vite dev server with HMR                                      |
| `npm run build`         | Typecheck, then build to `dist/`                              |
| `npm run preview`       | Serve the built `dist/` locally                               |
| `npm run lint`          | ESLint over the whole project                                 |
| `npm run lint:fix`      | ESLint with `--fix`                                           |
| `npm run format`        | Prettier, writing changes                                     |
| `npm run format:check`  | Prettier, failing on unformatted files (what CI runs)         |
| `npm run typecheck`     | `tsc -b` across both project references                       |
| `npm run test`          | Vitest, single run                                            |
| `npm run test:watch`    | Vitest in watch mode                                          |
| `npm run test:coverage` | Vitest with a V8 coverage report in `coverage/`               |
| `npm run check`         | lint → typecheck → test → build. Run this before opening a PR |

## Tooling

Kept deliberately small. Everything below earns its place; anything that did
not is listed under _Deliberately absent_.

| Package                                                 | Why                                                                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **vite** + **@vitejs/plugin-react**                     | Build tool and dev server. Fast, unopinionated, and outputs a plain static bundle.                                                                           |
| **react**, **react-dom**                                | The UI library.                                                                                                                                              |
| **react-router**                                        | Routing via the **data router** API (`createBrowserRouter`), for loaders, actions and per-route error boundaries later.                                      |
| **typescript**                                          | Strict mode, with the extra safety flags listed below.                                                                                                       |
| **vitest**                                              | Test runner. Shares Vite's transform pipeline, so tests and app resolve `@/` and CSS Modules identically — no duplicate config.                              |
| **jsdom**                                               | DOM implementation Vitest runs components against.                                                                                                           |
| **@testing-library/react** + **/dom**                   | Renders and queries components the way a user encounters them. `/dom` is a required peer of `/react` v16.                                                    |
| **@testing-library/jest-dom**                           | Readable DOM matchers (`toBeInTheDocument`, `toHaveClass`).                                                                                                  |
| **@testing-library/user-event**                         | Realistic interaction simulation for when interactive components arrive.                                                                                     |
| **@vitest/coverage-v8**                                 | Coverage via V8, no instrumentation step.                                                                                                                    |
| **eslint** + **@eslint/js**                             | Linting, flat config.                                                                                                                                        |
| **typescript-eslint**                                   | Type-aware lint rules — the ones that catch real bugs rather than style.                                                                                     |
| **eslint-plugin-react-hooks**                           | The rules of hooks, which no type checker can enforce.                                                                                                       |
| **eslint-plugin-jsx-a11y**                              | Static accessibility checks on JSX.                                                                                                                          |
| **eslint-plugin-import**                                | Import ordering and duplicate detection only. Resolution rules are off — `tsc` already reports unresolved imports better, which saves a resolver dependency. |
| **globals**                                             | Browser and Node global lists for the flat config.                                                                                                           |
| **prettier** + **eslint-config-prettier**               | Formatting. The config switches off every ESLint rule that would fight Prettier, so the two never disagree.                                                  |
| **husky** + **lint-staged**                             | Git hooks: lint and format staged files on commit, typecheck and test on push.                                                                               |
| **@types/node**, **@types/react**, **@types/react-dom** | Type definitions.                                                                                                                                            |

### Deliberately absent

No Tailwind, no CSS-in-JS, no component library, no animation library, no state
manager, no `clsx` (there is a four-line `cx` in `src/lib/classNames.ts`), no
icon package, no analytics, and no `eslint-import-resolver-typescript`.

### Version choices worth explaining

Five packages are **not** on their newest release. Each was pinned for a
concrete reason, not caution:

- **react-router 7, not 8.** v8 declares `engines.node >= 22.22.0`; the target
  environment is Node 22.14. The data router API this project uses is identical
  in both. Move to v8 when the Node floor is raised.
- **lint-staged 16, not 17.** Same reason — v17 requires Node ≥ 22.22.1.
- **jsdom 29, not 30.** Same reason — v30 requires Node ≥ 22.22.2. Installing it
  produces an `EBADENGINE` warning and an unsupported configuration.
- **TypeScript 6.0, not 7.0.** typescript-eslint 8 declares a peer range of
  `>=4.8.4 <6.1.0`. Installing TS 7 would silently break every type-aware lint
  rule, which is most of the value of the lint setup. Upgrade once
  typescript-eslint supports the native compiler.
- **ESLint 9, not 10.** `eslint-plugin-import` and `eslint-plugin-jsx-a11y`
  both cap their peer range at `^9`. npm prints a deprecation notice for
  ESLint 9; it is accurate, and moving to 10 is blocked on those two plugins
  rather than on anything here.

`npm audit` reports **0 vulnerabilities** as of the scaffold commit.

## Folder structure

```
.
├── .github/
│   ├── workflows/ci.yml      lint · format · typecheck · test · build
│   └── dependabot.yml        weekly npm + actions updates
├── .husky/                   pre-commit, pre-push
├── public/fonts/             self-hosted variable fonts go here
├── index.html                CSP, meta, Open Graph
├── eslint.config.js          flat config
├── vite.config.ts            build, aliases, Vitest, dev-only CSP relaxation
├── tsconfig.json             solution file → app + node projects
└── src/
    ├── app/                  router, providers, root layout, error boundary
    │   └── routes/           route components
    ├── components/           reusable UI, one folder each
    │   └── VisuallyHidden/   the reference implementation of the pattern
    ├── features/             feature slices
    │   ├── catalogue/        (empty)
    │   ├── specimen/         (empty)
    │   └── theme/            ThemeProvider, useSeason
    ├── lib/                  pure utilities — no React, no DOM
    ├── styles/               index · tokens · reset · global · fonts
    ├── data/                 static specimen records (empty)
    ├── types/                shared types
    ├── test/                 Vitest setup and shared helpers
    └── main.tsx              entry point
```

`@/` resolves to `src/`, configured in `tsconfig.app.json` and mirrored in
`vite.config.ts`. Both must be changed together.

## Design tokens and seasons

`src/styles/tokens.css` is a three-layer system.

**1. Primitives.** Raw values named after the material they came from —
`--paper-warm-100`, `--ink-irongall-900`, `--leaf-russet-600`. Context-free.
Components never touch this layer.

**2. Semantic tokens.** Role names: `--color-bg`, `--color-surface`,
`--color-ink`, `--color-ink-muted`, `--color-accent`, `--color-line`, plus the
spacing, type, radius, shadow, duration and easing scales. **This is the only
layer components are allowed to use.**

**3. Seasons.** `<html data-season="…">` remaps the semantic _colour_ tokens.
Nothing else moves — spacing, type and motion are identical across all four, so
re-theming can never shift the layout.

| Season | Months (SH) | The idea                                                          |
| ------ | ----------- | ----------------------------------------------------------------- |
| Spring | Sep–Nov     | New growth on pale wash paper; herbarium green-black, young olive |
| Summer | Dec–Feb     | Sun-bleached sheets, dried grass; sepia ink, ochre                |
| Autumn | Mar–May     | Pressed leaves on tanned card; walnut ink, russet                 |
| Winter | Jun–Aug     | Iron-gall ink on frost-grey stock; slate                          |

All four are light and paper-based. They vary in hue and warmth rather than
luminance, which is what keeps contrast stable — every semantic ink colour
clears WCAG 2.2 AA (≥ 4.5:1) against its own season's `--color-bg`.

`ThemeProvider` (`src/features/theme`) picks the season from today's date via
`seasonFromDate` in `src/lib/season.ts` — a pure function taking a `Date`, using
meteorological (whole-month) seasons so it needs no ephemeris, and unit-tested
for all twelve months. Read or change the season with the typed `useSeason()`
hook. Because the palettes live entirely in CSS, the neutral archival default
renders correctly even if the JavaScript never runs.

**Type and spacing are mobile-first and fluid.** Every step in the type scale is
a `clamp()` whose minimum is the mobile size. The preferred value is written as
`rem + vw` rather than `vw` alone, so the scale still responds to the reader's
browser font size — a `vw`-only preferred value silently defeats text zoom.

**Motion is token-only.** Under `prefers-reduced-motion: reduce` the three
duration tokens go to zero, which disables every transition in the project
because no component is permitted to hard-code a duration. `reset.css` adds a
blanket `!important` fallback for anything that slips through.

### Fonts

Two OFL-1.1 variable fonts, self-hosted, **not included in this repository** —
drop them into `public/fonts/` (see the README there):

- **EB Garamond** for display. An old-style serif with the plate-caption feel a
  herbarium wants.
- **Inter** for UI. A neutral grotesque that stays legible at the small sizes
  labels and metadata need.

Both are declared with `font-display: swap` and metric-matched fallback faces,
so text is never invisible and layout shift on swap stays near zero. No font CDN
is contacted — the CSP allows `font-src 'self'` only.

## Accessibility commitments

- Semantic landmarks on every page: one `<header>`, one `<main id="main">`, one
  `<footer>`.
- A skip link is the first focusable element. `#main` carries `tabIndex={-1}` so
  following it actually moves focus, not just scroll position.
- A visible `:focus-visible` ring on everything focusable, built from tokens so
  it recolours with the season. The UA outline is only removed where it is
  immediately replaced.
- Text clears WCAG 2.2 AA contrast in all four seasons.
- `prefers-reduced-motion` is honoured through the duration tokens.
- Screen-reader-only text uses the `<VisuallyHidden>` component — clipped, not
  `display: none`, so it stays in the accessibility tree.
- `lang="en-AU"` on `<html>`.
- `eslint-plugin-jsx-a11y` runs on every commit and in CI. It is a floor, not a
  substitute for keyboard-testing the thing.

## Security notes

- **No third parties.** No analytics, no trackers, no external scripts, no font
  CDN, no embeds. Nothing about a visitor leaves their browser.
- **Strict CSP** in `index.html`: `script-src 'self'` with no `unsafe-inline`
  and no `unsafe-eval`, `style-src 'self'`, `connect-src 'self'`,
  `object-src 'none'`, `frame-ancestors 'none'`.

  The dev server cannot satisfy that policy — Vite injects an inline Fast
  Refresh preamble, serves CSS as inline `<style>` before extraction, and opens
  an HMR WebSocket. Rather than weakening the shipped policy, the
  `thornfield:relax-csp-for-dev` plugin in `vite.config.ts` rewrites the meta
  tag at serve time only (`apply: 'serve'`). Build output is untouched, and
  `build.modulePreload.polyfill` is disabled because the polyfill would
  otherwise inject an inline script the policy forbids.

  If you deploy somewhere that can set response headers, move the policy to a
  real `Content-Security-Policy` header — `frame-ancestors` is not enforceable
  from a meta tag — and delete the tag.

- **No secrets.** The site needs none. Nothing in `.env` is read at build time.
- **Supply chain.** A short dependency list, `npm ci` in CI, and weekly
  Dependabot updates for both npm and GitHub Actions. The CI workflow requests
  `contents: read` and checks out without persisting credentials.
- Vulnerability reports: see [SECURITY.md](SECURITY.md).

## Contributing

Conventions — exports, component layout, TypeScript flags, styling rules,
testing, commit format — are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Code is [MIT](LICENSE).

Fonts are **not** covered by that licence. EB Garamond and Inter are each
distributed under the SIL Open Font Licence 1.1; keep every font file's
`OFL.txt` alongside it in `public/fonts/`.

Thornfield Botanical Archive is fictional. Any resemblance to a real
institution is coincidental.

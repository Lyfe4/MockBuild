# Thornfield Botanical Archive

A mock website for a fictional institution in the temperate south. The site is
meant to feel like the public face of a real collection: quiet, archival, built
around typography and paper rather than imagery. Its one flourish is that the
whole palette shifts with the season, Southern Hemisphere, so the archive is
dressed differently in July than in January.

The institution is invented. **The collection is not.** Thornfield holds real
species, each with a real record — taxonomy, distribution, phenology and the
morphological characters an identification key filters on — illustrated by a
hand-authored plate traced from a public-domain reference. Provenance for every
reference is in [references/SOURCES.md](references/SOURCES.md).

This repository is a portfolio piece. There is no real institution, and no data
is collected from anyone who visits.

> **Status: in progress.** The app shell, catalogue and specimen pages are
> built and run on the species records. The About, Journal and Request routes
> are linked but not yet written. The institution is mid-rename: it is an
> entomological collection now, and the wordmark has not caught up.

## How this evolved

The archive has been three things, and the reasoning is worth keeping because
each step was a decision to throw work away.

**1. A herbarium with a procedural plant generator.** Invented species, drawn
from a seeded parameter set — a stem, a branching rule, leaves, a flower. It
worked, and it was the wrong thing to have built. Every specimen was plausible
and none was _anything_: the records were fiction, so the illustrations had
nothing to be faithful to, and there was no way to tell a good drawing from a
bad one because there was nothing to compare it against.

**2. Real insects, still procedurally generated.** Beetles and moths from
presets, with a pigment system, a three-rank line hierarchy, hatching, and
bilateral symmetry from one authored half. Much better, and it hit a ceiling
that no amount of parameter tuning would move: the generator could draw a
plausible beetle but not a _particular_ one. Asked for _Lucanus cervus_ it
produced a beetle with big jaws, which is not the same animal.

**3. Hand-authored plates of real species, traced from public-domain
references.** Where it is now. An author measures a lithograph and writes the
path data out; the schema in `src/lib/plate` catches the mistakes a person
drawing coordinates by hand actually makes, and `validatePlate` runs in a test
for every plate. Every species carries a real record — taxonomy, distribution,
phenology, morphology — sourced and cited, so an identification key has
something true to key out.

What survived all three: the plate is **pure data**, the renderer turns it into
SVG, and the stylesheet turns roles into ink. Neither side knows the other's
vocabulary. The bilateral-symmetry trick survived too — the author draws the
right half and the renderer reflects it, so a plate cannot come out lopsided.

The generators are gone from the tree. Read the history if you want them:
`git log -- src/lib/plant src/lib/insect`.

## Screenshot

<!-- Replace with a real capture once the catalogue view exists. -->

_Screenshot placeholder — `docs/screenshot.png`, 1600×1000, showing the
catalogue in autumn._

## The plates

`src/lib/plate` is pure data out — no React, no DOM. A plate is path data plus
roles; the renderer turns it into SVG and the CSS turns roles into ink.

- **Plate space.** The midline is `x = 0` and `y` runs 0 at the head end to 1000
  at the abdomen tip, so two species are directly comparable. Appendages may
  leave that band and the frame is measured from the drawing.
- **Authors draw the right half only.** The renderer reflects it. That is the
  whole bilateral-symmetry mechanism.
- **Three line ranks** — outline, structure, detail — which is what makes one
  drawing work at 80 pixels and at 600.
- **`validatePlate` runs in a test for every plate**, because the mistakes a
  hand-drawn coordinate makes fail quietly: a stray minus sign puts a leg on the
  wrong side, the mirror puts a second one on top of it, and the plate renders
  with five legs and looks nearly right.

Adding a species is a record in `src/data/species`, a `*.plate.ts` beside it and
a test. It touches no component. `/lab/plates` (dev only) shows every plate at
three sizes with its reference below.

## Getting started

Requires Node 24 (see `.nvmrc`).

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

Two packages are **not** on their newest release. Both are held back by a peer
range rather than by choice, and neither is a judgement call:

- **TypeScript 6.0, not 7.0.** typescript-eslint 8 declares a peer range of
  `>=4.8.4 <6.1.0`. Installing TS 7 would silently break every type-aware lint
  rule, which is most of the value of the lint setup. Upgrade once
  typescript-eslint supports the native compiler.
- **ESLint 9, not 10.** `eslint-plugin-import` and `eslint-plugin-jsx-a11y`
  both cap their peer range at `^9`. npm prints a deprecation notice for
  ESLint 9; it is accurate, and moving to 10 is blocked on those two plugins
  rather than on anything here.

Everything else tracks latest stable. react-router, lint-staged and jsdom were
previously pinned back for a Node 22.14 toolchain and moved to their current
majors when the runtime went to Node 24.

One thing `npm outdated` will flag that is not a holdback: **@types/node** tracks
the Node version in `.nvmrc` (24.x), not its own latest (26.x). Type definitions
should describe the runtime you actually run, so bump it when `.nvmrc` moves and
not before.

`npm audit` reports **0 vulnerabilities**.

### Upgrading to react-router 8

Worth knowing if you are reading older examples: v8 is ESM-only, drops the
`react-router-dom` package, and **moves the DOM `RouterProvider` to
`react-router/dom`**. That last one is quiet rather than loud — a
`RouterProvider` is still exported from `react-router`, and importing it
type-checks and renders, but it is the core provider without
`ReactDOM.flushSync` wired in, so view transitions and scroll restoration stop
working correctly. `src/main.tsx` imports from `react-router/dom` for that
reason.

Middleware is always on in v8 and the `context` passed to loaders and actions is
now always a `RouterContextProvider`. Nothing in this scaffold has loaders yet,
so there was nothing to migrate; keep it in mind when the catalogue gains them.

## Folder structure

```
.
├── .github/
│   ├── workflows/ci.yml      lint · format · typecheck · test · build
│   └── dependabot.yml        weekly npm + actions updates
├── .husky/                   pre-commit, pre-push
├── public/fonts/             self-hosted variable fonts go here
├── references/               traced references + SOURCES.md. Never shipped.
├── index.html                CSP, meta, Open Graph
├── eslint.config.js          flat config
├── vite.config.ts            build, aliases, Vitest, dev-only CSP relaxation
├── tsconfig.json             solution file → app + node projects
└── src/
    ├── app/                  router, providers, root layout, error boundary
    │   └── routes/           route components
    ├── components/           reusable UI, one folder each
    │   ├── SpeciesIllustration/  renders a plate as SVG
    │   └── VisuallyHidden/   the reference implementation of the pattern
    ├── features/             feature slices
    │   ├── catalogue/        FilterPanel, SpecimenRow
    │   ├── specimen/         (empty)
    │   └── theme/            ThemeProvider, useSeason, SeasonSwitcher
    ├── hooks/                shared React hooks
    ├── lib/                  pure utilities — no React, no DOM
    │   ├── catalogue/        URL parsing, filtering, sorting
    │   ├── plate/            the plate schema, parser, validator, fit
    │   └── random/           seeded PRNG
    ├── styles/               index · tokens · reset · global · fonts
    ├── data/
    │   └── species/          one record and one plate per species
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

Two OFL-1.1 variable families, self-hosted in `public/fonts/` with their licence
files alongside. See the [README there](public/fonts/README.md) for provenance.

- **Fraunces** (Undercase Type) for display _and_ body. Four axes — `opsz`
  9–144, `wght`, `SOFT`, `WONK`. The optical-size axis is the reason it is here:
  one family sets headings with the fine hairlines of an engraved plate and body
  copy with strokes sturdy enough to survive at 16px. `WONK` swaps in the
  wayward glyph alternates and is used on the wordmark only.
- **JetBrains Mono** for labels, catalogue numbers and metadata. Uppercase and
  tracked out, it gives the ledger voice a museum accession label rather than a
  terminal.

`font-display: swap`, `unicode-range` per subset, and the two primary faces
preloaded from `index.html`. No font CDN is contacted — the CSP allows
`font-src 'self'` only.

The fallback faces carry `size-adjust` and metric overrides that were
**measured in a browser against the real files**, not estimated: Fraunces sets
much narrower than Georgia, so its fallback scales _down_ to 87.5%, which a
guess would very likely have got backwards. Re-measure if a font file changes.

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
- **Strict CSP.** `script-src 'self'` with no `unsafe-inline` and no
  `unsafe-eval`, `style-src 'self'`, `connect-src 'self'`, `object-src 'none'`.
  Nothing in the app needs an inline script or an inline style: CSS Modules
  compile to an external stylesheet, and the species plates carry their
  per-element values in SVG presentation attributes rather than a `style`
  attribute.

  The dev server cannot satisfy that policy — Vite injects an inline Fast
  Refresh preamble, serves CSS as inline `<style>` before extraction, and opens
  an HMR WebSocket. Rather than weakening the shipped policy, the
  `thornfield:relax-csp-for-dev` plugin in `vite.config.ts` rewrites the meta
  tag at serve time only (`apply: 'serve'`). Build output is untouched, and
  `build.modulePreload.polyfill` is disabled because the polyfill would
  otherwise inject an inline script the policy forbids.

- **No secrets.** The site needs none. Nothing in `.env` is read at build time.
- **Supply chain.** A short dependency list, `npm ci` in CI, and weekly
  Dependabot updates for both npm and GitHub Actions. The CI workflow requests
  `contents: read` and checks out without persisting credentials.
- Vulnerability reports: see [SECURITY.md](SECURITY.md).

### Security headers

Two layers, deliberately not one.

**Layer 1 — response headers (`public/_headers`).** The authoritative set,
served by Netlify. Everything in `public/` is copied to the root of `dist/`, and
Netlify reads `_headers` from the publish root.

| Header                       | Value                                                   |
| ---------------------------- | ------------------------------------------------------- |
| `Content-Security-Policy`    | The full policy, **including `frame-ancestors 'none'`** |
| `X-Content-Type-Options`     | `nosniff`                                               |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                       |
| `Permissions-Policy`         | Every feature denied — the archive uses none of them    |
| `Cross-Origin-Opener-Policy` | `same-origin`                                           |

**Layer 2 — the `<meta>` CSP in `index.html`.** The same policy _minus_
`frame-ancestors`, as a fallback for when `dist/` is served by something that
ignores `_headers`: `vite preview`, a plain static server, or a different host.

`frame-ancestors` is the reason the split exists rather than being a duplicate.
Browsers **ignore it in a `<meta>` tag** and log an error saying so, which is
worse than useless: it looks like clickjacking protection in the markup while
providing none. It belongs in the header, so that is the only place it appears.

`Strict-Transport-Security` is absent on purpose — Netlify issues it
automatically for HTTPS sites, and hand-setting a `max-age` risks pinning one
that outlives the certificate setup.

The two CSP copies must be kept in step. If you change one, change the other.

## Deployment

Netlify, from `dist/`. Two files in `public/` are copied to the publish root and
do the configuration:

- **`_redirects`** — the SPA catch-all, `/* /index.html 200`. It rewrites rather
  than redirects, so a hard load or deep link to a client-side route resolves
  instead of hitting Netlify's 404.
- **`_headers`** — the security headers described above.

## Contributing

Conventions — exports, component layout, TypeScript flags, styling rules,
testing, commit format — are in [CONTRIBUTING.md](CONTRIBUTING.md).

## Licence

Code is [MIT](LICENSE).

Fonts are **not** covered by that licence. Fraunces and JetBrains Mono are each
distributed under the SIL Open Font Licence 1.1; keep every font file's
`OFL.txt` alongside it in `public/fonts/`.

The traced references in `references/` are **not** covered by it either. Each is
public domain or otherwise freely licensed, and each one's author, publication
and licence is recorded in [references/SOURCES.md](references/SOURCES.md).

Thornfield is fictional. Any resemblance to a real institution is coincidental.
The species are real.

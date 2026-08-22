# CLAUDE.md

Orientation for future sessions. Conventions live in
[CONTRIBUTING.md](CONTRIBUTING.md) and the tooling rationale in
[README.md](README.md); this file is the short version plus the things that are
easy to get wrong.

## What this is

**Thornfield Botanical Archive** — a mock website for a fictional institution.
It is a portfolio piece: no real collection, no real data, nothing is collected
from a visitor.

The centre of the work is now a **fictional entomological archive**:
procedurally generated **pinned-specimen illustrations** — beetles
(Coleoptera) and moths (Lepidoptera) — drawn as engraved plates. Every
specimen is derived from a seed, so a given catalogue number always draws the
same animal.

The **plant generator (`src/lib/plant`, `components/PlantIllustration`) is
legacy** and will be removed. Do not extend it; new work goes into
`src/lib/insect`.

## Stack

Vite · React 19 · react-router 8 (data router) · TypeScript 6 strict · vanilla
CSS Modules · Vitest + Testing Library. No Tailwind, no CSS-in-JS, no component
library, no state manager. See README for why each dependency earns its place.

## Hard rules

These are not preferences. Breaking one breaks the build, the CSP, or a season.

- **Strict CSP.** `script-src 'self'`, `style-src 'self'` — **no inline styles,
  no inline scripts, ever**. SVG carries per-element values as _presentation
  attributes_ (`stroke-width`, `cx`, `d`), never a `style` attribute. Anything
  that varies by category goes through a `data-*` attribute mapped in a CSS
  Module. The policy is duplicated in `index.html` and `public/_headers`; change
  both together.
- **Tokens only for colour.** Components consume semantic tokens
  (`var(--color-ink)`), never primitives, never raw values. A new colour means a
  primitive, a semantic token, and a value in **all four** seasons.
- **`exactOptionalPropertyTypes`.** Component props are written
  `foo?: T | undefined`; internal config objects **omit** the key instead of
  passing `undefined`. Build optional keys with a spread:
  `...(x === undefined ? {} : { x })`.
- **`noUncheckedIndexedAccess`.** Indexing yields `T | undefined`. Handle it;
  never assert it away. No `any`.
- **Mobile-first.** Every `@media` is `min-width`. Type and spacing are fluid
  `clamp()`s whose minimum is the mobile size.
- **Every feature gets tests.** Colocated `*.test.ts(x)`. Pure logic gets a
  plain unit test in `src/lib`; components are queried by role and text, never
  by test id or class.
- **`npm run check` before every commit** (lint → typecheck → test → build).
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`,
  `chore:`.

## Generator architecture

`src/lib/insect` is **pure data out** — no React, no DOM, no `Math.random`, no
`Date.now`. It emits plain geometry; the renderer turns geometry into SVG and
the CSS turns parts into colour. Neither side knows the other's vocabulary.

The pipeline, per specimen:

```
preset spec  --resolvePreset(spec, seed)-->  Form  --generate(form, seed)-->  InsectGeometry
                                               \--describe(form)--> alt text
```

- **Seeded PRNG.** `mulberry32` in `src/lib/random`, seeded by
  `seedFromName(string)` (FNV-1a). Same `(form, seed)` always yields deeply
  equal geometry — the tests assert it.
- **`resolvePreset`** turns a _region_ of parameter space (`base` + `ranges` +
  `choices`) into one individual. This is where variation between specimens of
  a kind happens. **The RNG draw order is part of the reproducibility
  contract** — `NUMERIC_KEYS` is a fixed list, not `Object.keys()`, and
  reordering it changes every specimen.
- **`generate`** draws a form exactly as given. Its build order (head → thorax
  → elytra → markings → legs; body → hindwing → forewing) is likewise
  contractual.
- **`composeAndFit`** (`core/fit.ts`) does the last two steps for every order:
  it mirrors `side: 'right'` marks into their left twins — **this one function
  is the entire bilateral-symmetry mechanism** — then fits the animal to the
  view box, centred on the _midline_, not on the bounding box.
- **Insect space**: origin at the front of the animal on the midline, `+x` to
  the animal's right, `+y` towards the rear. Mirroring is therefore `x -> -x`
  and nothing else. Paired parts are authored **once, on the right**.
- **Containment is proved in the data, not by the clip.** Markings are placed
  against the measured profile of the surface they sit on; the renderer's
  `clipPath` is a second line of defence for curved margins. Geometry that
  relies on the clip is geometry that lies about itself.
- **`describe(form)`** returns the one-sentence alt text, read from the same
  parameters the drawing uses so the two cannot drift.

Adding an order is a folder under `src/lib/insect` plus one case in
`generateInsect`/`describeInsect`. It touches no component.

## The lab routes

Contact sheets for judging the generators. **Dev only** — they live behind
`import.meta.env.DEV` in `src/app/router.tsx` inside a dynamic `import()`, so
the branch is dead code at build time and the modules are never emitted.

```bash
npm run dev
```

- `/lab` — the legacy plant sheet.
- `/lab/insects` — beetles and moths, four presets × four seeds per order.
  `?size=large` for two-up, `?reroll=<n>` for a fresh set of seeds. The trait
  line under each card is what that seed actually chose; it is the only way to
  see a preset whose ranges are too narrow.

Both routes and their stylesheets are temporary and get deleted with the spike.

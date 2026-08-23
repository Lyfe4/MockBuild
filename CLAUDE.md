# CLAUDE.md

Orientation for future sessions. Conventions live in
[CONTRIBUTING.md](CONTRIBUTING.md) and the tooling rationale in
[README.md](README.md); this file is the short version plus the things that are
easy to get wrong.

## What this is

**Thornfield Botanical Archive** — a mock website for a fictional institution.
It is a portfolio piece: no real collection, no real data, nothing is collected
from a visitor.

The centre of the work is a **real entomological collection**: **hand-authored
plates** of actual species — starting with _Lucanus cervus_ — traced in a
simplified engraving style from public-domain references and rendered through a
shared schema. Every species carries a real record: taxonomy, distribution,
phenology and the morphological characters a later identification key will
filter on.

Two generations of code are on the way out, in this order:

- **The plant generator** (`src/lib/plant`, `components/PlantIllustration`) is
  legacy. Do not extend it.
- **The insect generator** (`src/lib/insect`, `components/InsectIllustration`)
  is legacy as of the plate spike. It hit a quality ceiling: it could draw a
  plausible beetle but not a particular one. It stays only so the two
  approaches can be compared on `/lab/plates`, and goes when plates replace it.

New work goes into `src/lib/plate`, `src/data/species` and
`components/SpeciesIllustration`.

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

## Plate architecture

`src/lib/plate` is **pure data out** — no React, no DOM. A plate is path data
plus roles; the renderer turns it into SVG and the CSS turns roles into ink.

```
Species record  ──┐
                  ├─ SpeciesIllustration ─→ SVG
SpeciesPlate    ──┘        │
                           └─ describePlate(species, {sex, hallmark}) → alt text
```

- **Plate space.** Midline at `x = 0`, `y` from 0 at the head end to 1000 at the
  abdomen tip, so two species are directly comparable. Appendages may leave that
  band — a stag beetle's tarsi reach past 1200 — and `plateViewBox` measures the
  drawing rather than assuming a frame.
- **Authors draw the right half only.** The renderer reflects it, which is the
  entire bilateral-symmetry mechanism. Parts that straddle the axis and are
  symmetric in themselves declare `mirror: false` and are drawn once; reflecting
  them would produce a doubled line.
- **Mirroring is two `<g>` groups, not a `<use>`.** A `clip-path` inside
  `<g transform="scale(-1,1)">` resolves in that group's own user space, so one
  clip definition confines the hatching on both wing cases. Do not "simplify"
  this into a `<use>` without re-reading `SpeciesIllustration`'s comment.
- **`validatePlate` runs in a test for every plate.** Seven error classes, all
  of them mistakes that otherwise fail _quietly_: a stray minus sign puts a leg
  on the wrong side and the mirror puts a second one on top of it, so the plate
  renders, looks nearly right, and has five legs.
- **Containment is proved in the data, not by the clip** — same rule the
  generator had. The plate test samples every clipped stroke against its
  surface's outline.
- **Three ranks, and `--plate-stroke-*` is a second set of widths.** Plate space
  is about nine times the generator's, so one shared number would give hairlines
  or slabs. The ratios match the generator's on purpose.
- **`references/`** holds every traced reference, committed, with
  `references/SOURCES.md` recording author, publication and licence. A reference
  whose licence forbids redistribution is gitignored and recorded by URL instead.

Adding a species is a record in `src/data/species`, a `*.plate.ts` beside it and
a test. It touches no component.

## Generator architecture (legacy)

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
- `/lab/plates` — the hand-authored plate against the generator's nearest
  preset, at 80, 240 and 600 pixels, in the current season, with the reference
  at the bottom. Frames are absolute pixels rather than fluid, because the
  comparison is about size itself. The validator's verdict is printed on the
  page.
- `/lab/insects` — beetles and moths, four presets × four seeds per order.
  `?size=large` for two-up; `?beetles=<n>` and `?moths=<n>` are the reroll
  rounds, one per order, and the **Reroll** link in each section heading bumps
  its own. The trait line under each card is what that seed actually chose —
  pigment, pattern layers, hatching — and it is the only way to see a preset
  whose ranges are too narrow.

All three routes and their stylesheets are temporary. `/lab` and `/lab/insects`
go with the generators; `/lab/plates` goes once the plates are wired into the
catalogue.

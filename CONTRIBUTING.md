# Contributing

Conventions for the Thornfield Botanical Archive. They exist so the codebase
reads as though one person wrote it.

## Getting set up

```bash
nvm use          # reads .nvmrc — Node 24
npm install      # also installs the Husky hooks via `prepare`
npm run dev
```

Before opening a pull request:

```bash
npm run check
```

That runs lint, typecheck, tests and a build — the same gates CI runs.

## Code conventions

### Exports

**Named exports everywhere.** One component per file, and the file is named
after it.

Default exports are permitted only where a framework demands one — currently
just `vite.config.ts`. ESLint enforces this with `no-restricted-syntax`; if you
hit a genuine exception, disable the rule on that line with a comment saying
why.

Barrels (`index.ts`) re-export a folder's public surface. Import from the
barrel across a boundary, and from the specific file within one.

### Components

Each reusable component gets a folder:

```
src/components/SpecimenCard/
  SpecimenCard.tsx          the component, named export
  SpecimenCard.module.css   its styles, imported as `styles`
  SpecimenCard.test.tsx     its tests, colocated
  index.ts                  re-exports the component and its props type
```

Props are always an exported `interface` named `XProps`:

```tsx
export interface SpecimenCardProps {
  accession: string;
  className?: string;
}

export function SpecimenCard({ accession, className }: SpecimenCardProps) { … }
```

Compose an optional `className` onto the component's own class with `cx` from
`@/lib/classNames` — never let a caller's class replace yours.

### TypeScript

`strict`, plus `noUncheckedIndexedAccess`, `noImplicitOverride`,
`exactOptionalPropertyTypes` and `verbatimModuleSyntax`.

Consequences worth knowing before they surprise you:

- Indexing an array or record yields `T | undefined`. Handle it; do not assert
  it away.
- With `exactOptionalPropertyTypes`, `{ season?: Season }` will not accept an
  explicit `undefined`. For internal config objects, omit the property instead.
  For **component props**, write `?: T | undefined`:

  ```tsx
  className?: string | undefined;
  ```

  Callers pass these through conditionally — and a CSS Module class is
  `string | undefined` under `noUncheckedIndexedAccess` — so a prop that cannot
  accept `undefined` forces every caller into a workaround. Accepting it is the
  honest signature.

- With `verbatimModuleSyntax`, type-only imports must say `import type`. ESLint
  fixes this for you.

No `any`. If a type is genuinely unknown, use `unknown` and narrow it.

### Where code goes

| Folder            | Holds                                                            |
| ----------------- | ---------------------------------------------------------------- |
| `src/app/`        | Router, providers, root layout — the shell, not the content      |
| `src/components/` | Reusable UI with no feature knowledge                            |
| `src/features/`   | Feature slices; each owns its components, hooks, types, tests    |
| `src/lib/`        | Pure utilities. **No React, no DOM, no imports from `features`** |
| `src/hooks/`      | Shared React hooks. React, but no feature knowledge              |
| `src/styles/`     | Tokens, reset, global styles, fonts                              |
| `src/data/`       | Static specimen records, typed                                   |
| `src/types/`      | Types shared across more than one slice                          |
| `src/test/`       | Vitest setup and shared test helpers                             |

Feature slices do not import from each other. If two need the same thing, it
moves up into `components`, `lib` or `types`.

Import with the `@/` alias across folders (`@/lib/classNames`), and relative
paths within a folder (`./ThemeContext`).

### Styling

Vanilla CSS with CSS Modules. No Tailwind, no CSS-in-JS, no UI kit.

**Consume semantic tokens only** — `var(--color-ink)`, `var(--space-md)`. Never
a primitive (`var(--ink-sepia-900)`) and never a raw value. A hard-coded colour
or duration is the one thing certain to break a season or someone's
reduced-motion setting.

Adding a colour means adding a primitive and a semantic token, then giving all
four seasons a value for it. Check the new colour against each season's
`--color-bg` for at least 4.5:1.

Class names inside a module are local, so keep them plain: `.root`, `.header`,
`.isActive`. No BEM — the module does the namespacing.

### Accessibility

Not a review step; a definition of done.

- Semantic HTML first. A `<button>` before a `<div onClick>`, always.
- Every interactive element must be reachable and operable by keyboard, with a
  visible `:focus-visible` ring.
- Images carry real `alt` text, or `alt=""` if they are decorative.
- Text meets WCAG 2.2 AA contrast against its background in **all four**
  seasons.
- Motion is built from the duration tokens so `prefers-reduced-motion` disables
  it. Never hard-code a duration.
- Use the `<VisuallyHidden>` component for screen-reader-only text.

### Tests

Colocated, `*.test.ts(x)`, Vitest with Testing Library.

Test behaviour, not implementation. Query the way a user finds things — by
role, label or text — not by test id or class. If a component is hard to query
accessibly, that is usually the component telling you something.

Pure logic belongs in `src/lib` with a plain unit test; `seasonFromDate` is the
model. Keep `Date.now()` and other ambient state out of pure functions — pass
them in.

Use `renderWithProviders` from `@/test/renderWithProviders` when a component
reads context, and Testing Library's plain `render` when it does not.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add specimen detail route
fix: correct autumn accent contrast against sunken surface
chore: bump vite to 8.2.3
docs: explain the seasonal token layer
```

Common types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`,
`perf`, `ci`.

## Hooks

Husky installs two:

- **pre-commit** — `lint-staged` runs ESLint and Prettier over staged files
  only. Fast.
- **pre-push** — `npm run typecheck` and `npm run test` over the whole project.

If a hook fails, fix the cause. `--no-verify` just moves the failure to CI,
where it is slower and more public.

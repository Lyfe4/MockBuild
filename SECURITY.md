# Security Policy

## Scope

The Thornfield Botanical Archive is a static, client-side portfolio site for a
fictional institution. It has no backend, no database, no authentication and no
user accounts. It collects nothing, stores nothing, and sends nothing anywhere:
there are no analytics, no trackers and no third-party scripts.

That narrows the realistic attack surface to the supply chain (an npm dependency
or a GitHub Action), the build configuration, and the content security policy in
`index.html`.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private vulnerability reporting — the **Security** tab, then
**Report a vulnerability** — which opens a private advisory visible only to the
maintainers.

Please include:

- what the issue is and where in the repository it lives,
- how to reproduce it, ideally as a minimal case,
- what an attacker could actually do with it.

## What to expect

| Stage                        | Target                                       |
| ---------------------------- | -------------------------------------------- |
| Acknowledgement              | Within 5 working days                        |
| Initial assessment           | Within 10 working days                       |
| Fix or documented mitigation | Depends on severity; you will be kept posted |

This is a personal project maintained in spare time, so those are honest
targets rather than a contractual SLA. You will be credited in the advisory
unless you would rather not be.

## Supported versions

Only the current `main` branch is supported. There are no released or
long-lived versions to backport to.

## Out of scope

- Findings from automated scanners with no demonstrated impact on a static site
- Missing security headers that a static host, not this repository, controls
  (`Strict-Transport-Security`, `X-Content-Type-Options`, and similar)
- Clickjacking on pages with no state-changing actions
- Anything requiring a compromised or physically accessible developer machine
- The placeholder `example.com` URLs in the Open Graph tags

## Practices in this repository

- Dependencies are kept deliberately few, and every one is listed with its
  reason in the README's Tooling section.
- Dependabot raises npm and GitHub Actions updates weekly.
- CI runs lint, formatting, typecheck, tests and a build on every push and pull
  request.
- `index.html` ships a strict Content-Security-Policy: `script-src 'self'` with
  no `unsafe-inline` and no `unsafe-eval`, `connect-src 'self'`, and
  `object-src 'none'`. The dev server relaxation is applied by a Vite plugin at
  serve time only and never reaches a build.
- No secrets are stored in this repository, and the site needs none to run.

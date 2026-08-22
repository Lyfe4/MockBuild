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
- `Strict-Transport-Security`, which the host issues rather than this repository
- Clickjacking on pages with no state-changing actions
- Anything requiring a compromised or physically accessible developer machine
- The placeholder `example.com` URLs in the Open Graph tags

## Practices in this repository

- Dependencies are kept deliberately few, and every one is listed with its
  reason in the README's Tooling section.
- Dependabot raises npm and GitHub Actions updates weekly.
- CI runs lint, formatting, typecheck, tests and a build on every push and pull
  request.
- Security headers are served from `public/_headers`: a strict
  Content-Security-Policy with `script-src 'self'` (no `unsafe-inline`, no
  `unsafe-eval`), `connect-src 'self'`, `object-src 'none'` and
  `frame-ancestors 'none'`, plus `X-Content-Type-Options`, `Referrer-Policy`,
  a fully restrictive `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.
  `index.html` carries the same CSP minus `frame-ancestors` as a fallback for
  hosts that ignore that file. See the README's Security headers section.
- The dev server's CSP relaxation is applied by a Vite plugin at serve time only
  and never reaches a build.
- No secrets are stored in this repository, and the site needs none to run.

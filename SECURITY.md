# Security Policy

## Supported versions

We support the `dev` and `main` branches of this repository. Security patches will be applied to both whenever a vulnerability is confirmed.

## Reporting a vulnerability

Please report security vulnerabilities **privately** — do not open a public GitHub issue.

- Email: `security@threedreamz.com`
- Subject: `[SECURITY] <module slug> <one-line summary>`
- Include: a reproduction, the affected commit hash, and your expected impact.

We aim to acknowledge within 72 hours and provide a timeline for a fix within 7 days. Coordinated disclosure preferred — give us a reasonable window before publishing.

## Out of scope

- Findings against running deployments where the report is "this URL is publicly reachable" — most modules are designed to be reachable; vulnerability requires demonstrating impact (data exfiltration, privilege escalation, RCE, auth bypass).
- Brute-force / DoS findings against rate-limited endpoints.
- Reports based purely on missing security headers without an exploit path. We track those internally; please file a normal issue.

## Hard rules baked into the codebase

- `unsafe-eval` MUST NOT ship to production CSP. See `.claude/rules/security-headers.md` if it exists at the repo root, otherwise the canonical CSP rule is enforced via the `security` auditor in `audit/`.
- All admin write routes MUST gate behind MFA — see `requireAdminWithMfa()` in `@mw/auth-nextauth`.
- Secrets MUST be read from env vars; the pre-write hook in the parent GMW repo blocks `.env*` writes. Production secrets are configured via the Railway dashboard.
- Customer / contact records are in-scope for GDPR. Always honor `emailConsent` / `trackingConsent` flags surfaced by the canonical `CanonicalCustomer` type.

## Scope of this policy

This file covers the OpenSoftware monorepo. The Grand-Master-Weaver orchestrator (parent repo) and the Open3D family (when split into its own public repo) inherit this policy.

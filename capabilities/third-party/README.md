# Third-Party Capabilities

Directory for capabilities provided by external vendors — they declare themselves here via a YAML manifest and we proxy their HTTP API through our job queue.

Part of **Pillar C** of the 3Dreamz Product-Experience Platform (see the plan at `~/.claude/plans/neue-funktion-3d-modell-ancient-kurzweil.md`). The point: merchants using the shop-integrations app can pick enhancement apps (3dreel.app, product-photo AI stagers, turntable renderers, …) from an in-admin marketplace, and each one ships as a YAML file in this directory.

## Shape

Same stability flags as `../open3d/*.yaml`, plus third-party-specific fields:

```yaml
id: <slug>                          # stable id, used as queue job kind
provider: <domain>                  # e.g. 3dreel.app
providerName: <display name>
stability: experimental | beta | stable
stabilityNote: >
  Why it's not stable yet.
endpoint: https://...               # their HTTP API we proxy
authMode: oauth | apiKey | none
inputs: [model.glb, image/jpeg, …]  # MIME types / domain-specific handles
outputs: [image/webp, video/mp4, …]
billing: perJob | subscription | free
perJobPriceCents: 50                # only if billing=perJob
description: >
  Shown to merchants in the enhancement picker.
website: https://...
logo: https://...                   # ~128x128 icon URL
```

## How it's loaded

The generic `apps/third-party-worker/` (Wave-C agent work) scans this directory at startup, registers each entry as a handler on the `@opensoftware/queue` BullMQ queue with `kind = id`, and proxies incoming jobs to the declared `endpoint` with the right auth + input serialization.

## Stability policy

Same as in-house capabilities (`opensoftware-conventions.md` §Stability):
- `stable` — battle-tested, documented, not changing.
- `beta` — feature-complete, schema frozen, edge cases may still emerge.
- `experimental` — may depend on fragile external state; response shape can change.

The admin enhancement picker UI badges each entry accordingly so merchants know what to expect.

## Adding a new vendor

1. PR one YAML file into this directory (no code, YAML only — that's the whole extension surface).
2. If the vendor needs OAuth (most do), also submit credentials for the Wave-C agent's `third-party-worker` env vars.
3. CI runs `packages/open3d-smoke-tests/__tests__/stability-flag.smoke.test.ts` — the same drift guard that prevents silent stability-flag flips on in-house capabilities covers third-party entries too.

## Seed entries

- `3dreel-staging.yaml` — placeholder until we confirm the real 3dreel.app API shape (vendor integration call pending).

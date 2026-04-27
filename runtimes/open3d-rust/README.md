# open3d-rust — SKELETON

This is **deliberately a placeholder runtime**, not a stub to finish. Nothing
in the ecosystem references it yet. `src/main.rs` is a 26-line JSON-RPC 2.0
echo that answers `{"status":"ok","runtime":"rust"}` to any input, and
`Cargo.toml` depends only on `serde` + `serde_json`. It exists to reserve
the runtime slot and document intent.

## Why keep the skeleton

Some Python handlers in `runtimes/open3d-python/` will eventually need a
faster execution path — specifically mesh-decimate, BVH-build, and spatial
queries that trimesh handles in pure Python. When one of those hits a real
performance wall (see gate below), the plan is to port *just that one
handler* to Rust and have `apps/open3d-api` dispatch between the Python LRP
and the Rust runtime on a per-capability basis.

Leaving the skeleton makes that future port:
- a matter of adding functions to `src/main.rs`, not bootstrapping a new
  runtime (Cargo, build pipeline, spawn contract, JSON-RPC shape)
- documented in the catalog family without a code change ("rust runtime
  slot is reserved")

## Gate criterion — when to actually build this out

Start the port when **a Python handler in `runtimes/open3d-python/` regularly
exceeds 10 seconds of wall time** on the expected input sizes, AND a Rust
port is expected to deliver at least 5× speedup (verified in a one-off
benchmark before commitment).

Strongest current candidates:
- `analyze_mesh` on 10M+ triangle Keyence VL-series scans
- A future `mesh-decimate` handler (trimesh.simplify is ~O(n²))
- BVH build for any future ray-based inspection workflow

## When you DO start porting

1. Extend `Cargo.toml` with the real deps (`nalgebra`, `ply-rs`,
   `triangulate`, `parry3d` for spatial ops, etc.).
2. Replace the echo in `src/main.rs` with a handler registry matching the
   Python convention: `{ "jsonrpc": "2.0", "method": "mesh-decimate",
   "params": {...}, "id": N }` → `{ "result": {...}, "id": N }`.
3. Teach `apps/open3d-api/src/lrp-manager.ts` to spawn both runtimes and
   route capabilities to the fastest one (or whichever has a registered
   handler).
4. Update `packages/open3d-smoke-tests/__tests__/open3d-worker.smoke.test.ts`
   to include the Rust-registered capabilities in the drift check.
5. Add `stability: experimental` in the corresponding `capabilities/open3d/
   *.yaml` until the Rust path is proven.

## Do NOT

- Add Cargo deps here "just in case". Empty skeleton is the feature.
- Delete this runtime without re-running the gate criterion discussion. A
  deleted skeleton costs an extra half-session to resurrect; a dormant
  one costs nothing.

## Cross-references

- Python runtime that this mirrors: [`runtimes/open3d-python/main.py`](../open3d-python/main.py)
- Build + deploy orchestrator: [`apps/open3d-api/src/lrp-manager.ts`](../../apps/open3d-api/src/lrp-manager.ts)
- Roadmap entry (Wave 2 B2.1): Grand-Master-Weaver plan file.

# MirrorCraft Engine v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MirrorCraft Engine v2 as a local-first, resumable 7D website/project intelligence and reconstruction system with Code360, DeepScan, multi-format intake, fidelity validation, and scoped auto-repair.

**Architecture:** Extend the existing Next.js 16 / React 19 / TypeScript codebase around a canonical `SiteDNA` representation and `Code360` graph. Each LayerStack phase writes deterministic, hash-addressed artifacts so capture, analysis, reconstruction, validation, and repair can resume independently and only invalidate changed dependents.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Tailwind CSS v4, Playwright, Node.js 20+, SHA-256 content hashing, Vitest for unit/integration tests, Playwright Test for browser/e2e validation.

**Spec:** `docs/superpowers/specs/2026-09-26-mirrorcraft-engine-v2-design.md`

## Global Constraints

- Product-facing identity is exclusively **MirrorCraft**; legacy project/product brand names must not appear in UI, commands, module names, generated marketing copy, or primary documentation.
- License-required attribution remains only where legally required, such as `LICENSE` and `NOTICE`.
- Node.js floor remains `>=20`.
- Default reconstruction target is Next.js + React + Tailwind.
- Default viewports are 1440x900, 1280x800, 768x1024, 390x844, and 360x800.
- Public web capture is same-domain by default and must not bypass authentication, paywalls, CAPTCHA, anti-bot controls, or CDN/origin protection.
- Secrets, credentials, session identifiers, payment data, and private API keys are never persisted in clear text.
- Encrypted/protected content may be classified and fingerprinted but not cracked or decrypted without supplied authorization/key material.
- All expensive work is bounded by configurable route, depth, worker, repair-pass, and artifact-size ceilings.
- Every LayerStack phase must be checkpointable and resumable.

## Review Focus

1. **Redirect loops / huge route spaces:** RouteAtlas must normalize URLs, stop cycles, respect page/depth budgets, and surface exclusions instead of hanging.
2. **Secret-bearing source/config files:** SourceScanner/DataMap/SecurityGraph must redact values before any artifact, log, cache, or UI output is written.
3. **Dynamic pages that never become idle:** PrismCapture must use bounded stable-state heuristics and still produce a partial capture with warnings.
4. **Incremental rescan after one small change:** hashing/invalidation must preserve unaffected SiteDNA/Code360 nodes and rerun only impacted phases/routes.
5. **Repair regression:** RepairLoop must reject a patch that lowers affected-route fidelity or breaks compile/typecheck and retain the prior working state.

---

## File Structure

Primary new/expanded implementation areas:

```text
src/mirrorcraft/
  shared/
    types.ts
    errors.ts
    hashing.ts
    redaction.ts
    limits.ts
  intake/
    normalize-source.ts
  cache/
    artifact-cache.ts
  checkpoints/
    checkpoint-store.ts
  prism-capture/
    capture-page.ts
    stable-state.ts
    network-sanitize.ts
  route-atlas/
    normalize-url.ts
    discover-routes.ts
  asset-vault/
    inventory-assets.ts
  source-scanner/
    scan-source.ts
    classify-content.ts
  site-dna/
    schema.ts
    builder.ts
  code360/
    graph.ts
    builder.ts
    lookup.ts
  motion-map/
    capture-states.ts
  data-map/
    build-data-map.ts
  host-map/
    build-host-map.ts
  security-graph/
    build-security-graph.ts
  layer-stack/
    orchestrator.ts
    invalidation.ts
  providers/
    types.ts
    router.ts
  rebuild-core/
    reconstruct.ts
  view-matrix/
    profiles.ts
    render.ts
  fidelity-lab/
    score.ts
    compare.ts
  repair-loop/
    repair.ts
  format-bridge/
    export.ts
  index.ts

src/app/studio/
  page.tsx
  studio-client.tsx
  components/*

scripts/
  mirror.mjs

tests/mirrorcraft/
  *.test.ts

tests/e2e/
  mirrorcraft-studio.spec.ts
```

Existing `src/mirrorcraft/*` files should be inspected and extended in place where they already implement an approved interface; do not duplicate a module under a second name.

---

### Task 1: Shared contracts, limits, hashing, and redaction

**Files:**
- Create/modify: `src/mirrorcraft/shared/types.ts`
- Create: `src/mirrorcraft/shared/limits.ts`
- Create: `src/mirrorcraft/shared/hashing.ts`
- Create: `src/mirrorcraft/shared/redaction.ts`
- Create: `src/mirrorcraft/shared/errors.ts`
- Test: `tests/mirrorcraft/shared.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `ProjectSource`, `ScanMode`, `ScanLimits`, `ArtifactRef`, `CheckpointManifest`, `RedactedValue`, `sha256(input)`, `redactSecretLike(value)`.
- Consumes: none.

- [ ] **Step 1: Add Vitest test/runtime dependencies and `test`, `test:unit`, `test:e2e` scripts.**
- [ ] **Step 2: Write failing tests for stable SHA-256 output, default mode limits, secret redaction, and immutable artifact identifiers.**
- [ ] **Step 3: Run `npm run test:unit -- shared` and verify failure because contracts/utilities are missing.**
- [ ] **Step 4: Implement the shared types and helpers with exact spec defaults and no secret persistence.**
- [ ] **Step 5: Run `npm run test:unit -- shared`; expected PASS.**
- [ ] **Step 6: Run `npm run typecheck`; expected PASS.**
- [ ] **Step 7: Commit `feat(core): add MirrorCraft shared contracts and redaction primitives`.**

### Task 2: Intake normalization, artifact cache, and checkpoints

**Files:**
- Create/modify: `src/mirrorcraft/intake/normalize-source.ts`
- Create: `src/mirrorcraft/cache/artifact-cache.ts`
- Create: `src/mirrorcraft/checkpoints/checkpoint-store.ts`
- Test: `tests/mirrorcraft/intake-checkpoints.test.ts`

**Interfaces:**
- Consumes: `ProjectSource`, `ScanLimits`, `sha256` from Task 1.
- Produces: `normalizeProjectSource(input) -> ProjectSource`, `ArtifactCache`, `CheckpointStore`, `resumePlan(manifest, currentInputHash)`.

- [ ] **Step 1: Write failing tests for URL/image/html/project normalization, cache hit by content hash, checkpoint resume, stale checkpoint invalidation, and cancelled-run preservation.**
- [ ] **Step 2: Run the focused test file and verify expected failures.**
- [ ] **Step 3: Implement normalization and filesystem-backed project cache/checkpoint stores with atomic writes.**
- [ ] **Step 4: Run focused tests; expected PASS.**
- [ ] **Step 5: Commit `feat(core): add normalized intake and resumable checkpoints`.**

### Task 3: RouteAtlas and bounded PrismCapture

**Files:**
- Create: `src/mirrorcraft/route-atlas/normalize-url.ts`
- Create: `src/mirrorcraft/route-atlas/discover-routes.ts`
- Create: `src/mirrorcraft/prism-capture/stable-state.ts`
- Create: `src/mirrorcraft/prism-capture/network-sanitize.ts`
- Create: `src/mirrorcraft/prism-capture/capture-page.ts`
- Test: `tests/mirrorcraft/route-capture.test.ts`
- Test fixture: `tests/fixtures/site-basic/*`

**Interfaces:**
- Consumes: Task 1 limits/redaction; Task 2 cache/checkpoints.
- Produces: `normalizeUrl(url, base)`, `discoverRoutes(seed, options)`, `capturePage(route, profile, options) -> CaptureArtifact`.

- [ ] **Step 1: Write failing tests for canonical URL normalization, duplicate/cycle removal, same-domain enforcement, max-page/max-depth stopping, and exclusion patterns.**
- [ ] **Step 2: Add a Playwright fixture page that continuously polls; test that stable-state timeout returns a partial capture with a warning rather than hanging.**
- [ ] **Step 3: Add tests proving authorization/cookie/header values are sanitized from captured network metadata.**
- [ ] **Step 4: Implement RouteAtlas and bounded PrismCapture with configurable worker concurrency.**
- [ ] **Step 5: Run focused unit/integration tests; expected PASS.**
- [ ] **Step 6: Commit `feat(capture): add bounded route discovery and PrismCapture`.**

### Task 4: AssetVault and SourceScanner

**Files:**
- Create: `src/mirrorcraft/asset-vault/inventory-assets.ts`
- Create: `src/mirrorcraft/source-scanner/classify-content.ts`
- Create: `src/mirrorcraft/source-scanner/scan-source.ts`
- Test: `tests/mirrorcraft/assets-source.test.ts`
- Fixtures: `tests/fixtures/source-mixed/*`

**Interfaces:**
- Consumes: hashing/redaction from Task 1; capture output from Task 3.
- Produces: `AssetRecord[]`, `SourceFileRecord[]`, dependency/import/endpoint hints, minified/obfuscated/encrypted classifications.

- [ ] **Step 1: Write failing tests for duplicate asset hashing, dimensions/type inventory, supported file-pattern detection, import/dependency hints, safe Base64/URL decoding, and encrypted-content classification without decryption.**
- [ ] **Step 2: Add a fixture containing secret-like config values and assert every scanner artifact contains only redacted fingerprints.**
- [ ] **Step 3: Implement inventory and scanner adapters; use AST parsers where available and lexical fallback otherwise.**
- [ ] **Step 4: Run focused tests; expected PASS.**
- [ ] **Step 5: Commit `feat(scan): add AssetVault and SourceScanner`.**

### Task 5: SiteDNA v2 and Code360 graph

**Files:**
- Create/modify: `src/mirrorcraft/site-dna/schema.ts`
- Create/modify: `src/mirrorcraft/site-dna/builder.ts`
- Create/modify: `src/mirrorcraft/code360/graph.ts`
- Create/modify: `src/mirrorcraft/code360/builder.ts`
- Create: `src/mirrorcraft/code360/lookup.ts`
- Test: `tests/mirrorcraft/sitedna-code360.test.ts`

**Interfaces:**
- Consumes: capture, routes, assets, and source records from Tasks 3–4.
- Produces: `SiteDNA`, `Code360Graph`, `findSourceForVisualNode(nodeId)`, reverse edge traversal.

- [ ] **Step 1: Write failing schema tests requiring `version: "2.0"` and every canonical SiteDNA top-level field from the spec.**
- [ ] **Step 2: Write graph tests for all core node/edge types and reverse lookup from DOM/visual node to source/component.**
- [ ] **Step 3: Implement deterministic builders; IDs must be stable for unchanged normalized inputs.**
- [ ] **Step 4: Run focused tests twice and assert serialized artifacts are byte-stable for identical input.**
- [ ] **Step 5: Commit `feat(intelligence): add SiteDNA v2 and Code360 graph`.**

### Task 6: MotionMap, DataMap, HostMap, and SecurityGraph

**Files:**
- Create: `src/mirrorcraft/motion-map/capture-states.ts`
- Create: `src/mirrorcraft/data-map/build-data-map.ts`
- Create: `src/mirrorcraft/host-map/build-host-map.ts`
- Create: `src/mirrorcraft/security-graph/build-security-graph.ts`
- Test: `tests/mirrorcraft/intelligence-maps.test.ts`

**Interfaces:**
- Consumes: SiteDNA/Code360 plus capture/source metadata.
- Produces: `MotionMap`, `DataMap`, `HostMap`, `SecurityGraph` attached by stable node IDs.

- [ ] **Step 1: Write failing tests for hover/focus/open-state recording, REST/GraphQL/WebSocket hints, public-host metadata classification, and defensive findings for unsafe DOM sinks / wildcard messaging / exposed secret patterns.**
- [ ] **Step 2: Assert HostMap reports CDN edge as `origin: "unverified"` and has no hidden-origin probing interface.**
- [ ] **Step 3: Assert security finding evidence is redacted before serialization.**
- [ ] **Step 4: Implement map builders and attach their nodes/edges to Code360.**
- [ ] **Step 5: Run focused tests; expected PASS.**
- [ ] **Step 6: Commit `feat(intelligence): add runtime data host and security maps`.**

### Task 7: LayerStack orchestration, modes, invalidation, pause/resume/cancel

**Files:**
- Create: `src/mirrorcraft/layer-stack/invalidation.ts`
- Create: `src/mirrorcraft/layer-stack/orchestrator.ts`
- Create: `src/mirrorcraft/fast-path/config.ts`
- Create: `src/mirrorcraft/deep-scan/config.ts`
- Test: `tests/mirrorcraft/layer-stack.test.ts`

**Interfaces:**
- Consumes: Tasks 1–6.
- Produces: `runLayerStack(project, mode, control)`, `pause()`, `resume()`, `cancel()`, phase events, dependency invalidation plan.

- [ ] **Step 1: Write failing tests for exact L0–L8 phase order, FastPath/Balanced/DeepScan/MAX budgets, pause/resume, cancel, and independent failed-unit retry.**
- [ ] **Step 2: Add the Review Focus incremental-rescan test: change one source fixture and assert unaffected route/capture hashes remain reused.**
- [ ] **Step 3: Implement dependency-aware invalidation and bounded worker pools.**
- [ ] **Step 4: Run focused tests; expected PASS.**
- [ ] **Step 5: Commit `feat(pipeline): add resumable LayerStack orchestration`.**

### Task 8: AI provider abstraction and RebuildCore

**Files:**
- Create: `src/mirrorcraft/providers/types.ts`
- Create: `src/mirrorcraft/providers/router.ts`
- Create: `src/mirrorcraft/rebuild-core/reconstruct.ts`
- Test: `tests/mirrorcraft/providers-rebuild.test.ts`

**Interfaces:**
- Consumes: SiteDNA, Code360, LayerStack artifacts.
- Produces: provider-neutral `GenerationRequest/GenerationResult`, `reconstructProject(input, target) -> ReconstructedProject` with per-node confidence metadata.

- [ ] **Step 1: Write failing tests for local-first provider selection, optional cloud fallback only after configured low-confidence/failure conditions, and provider-unavailable graceful degradation.**
- [ ] **Step 2: Write reconstruction tests for shared-component reuse, route generation, design-token mapping, asset links, and default Next.js/Tailwind target.**
- [ ] **Step 3: Implement provider router interfaces without hard-coding any vendor into canonical artifacts.**
- [ ] **Step 4: Implement minimal deterministic reconstruction adapter using fixture/mock provider responses.**
- [ ] **Step 5: Run focused tests and `npm run typecheck`; expected PASS.**
- [ ] **Step 6: Commit `feat(rebuild): add provider-neutral reconstruction core`.**

### Task 9: ViewMatrix, FidelityLab, and scoped RepairLoop

**Files:**
- Create/modify: `src/mirrorcraft/view-matrix/profiles.ts`
- Create/modify: `src/mirrorcraft/view-matrix/render.ts`
- Create: `src/mirrorcraft/fidelity-lab/score.ts`
- Create: `src/mirrorcraft/fidelity-lab/compare.ts`
- Create/modify: `src/mirrorcraft/repair-loop/repair.ts`
- Test: `tests/mirrorcraft/fidelity-repair.test.ts`

**Interfaces:**
- Consumes: reconstructed output + Code360 reverse lookup.
- Produces: five raw fidelity sub-scores plus overall score, mismatch records tied to Code360 nodes, minimal repair patches.

- [ ] **Step 1: Write failing tests for the five default viewport profiles and raw Visual/Structure/Responsive/Behavior/Assets scores.**
- [ ] **Step 2: Write a failing mismatch-to-source lookup test proving a visual mismatch resolves to a specific component/source record.**
- [ ] **Step 3: Add the Review Focus repair-regression test: a mock patch that lowers fidelity or fails compile/typecheck must be rejected and prior output preserved.**
- [ ] **Step 4: Implement scoring/comparison and bounded RepairLoop with repair budget + target-fidelity stop conditions.**
- [ ] **Step 5: Run focused tests; expected PASS.**
- [ ] **Step 6: Commit `feat(validate): add fidelity scoring and scoped repair loop`.**

### Task 10: FormatBridge and portable `.mirror` project container

**Files:**
- Create: `src/mirrorcraft/format-bridge/export.ts`
- Create: `src/mirrorcraft/format-bridge/project-container.ts`
- Test: `tests/mirrorcraft/format-bridge.test.ts`

**Interfaces:**
- Consumes: all canonical artifacts and reconstructed project output.
- Produces: SiteDNA JSON, Code360 JSON, HTML/CSS, React/Next.js target bundles, ZIP, and portable `project.mirror/` container; Git export remains an explicit authorized adapter.

- [ ] **Step 1: Write failing tests for required portable-project files and deterministic manifest metadata.**
- [ ] **Step 2: Write export tests ensuring no redacted secret can reappear through output adapters.**
- [ ] **Step 3: Implement filesystem/ZIP exporters and target adapters; keep Git writes behind an explicit authorization boundary.**
- [ ] **Step 4: Run focused tests; expected PASS.**
- [ ] **Step 5: Commit `feat(export): add FormatBridge and portable project container`.**

### Task 11: `/studio` UI and progress/control experience

**Files:**
- Create/modify: `src/app/studio/page.tsx`
- Create: `src/app/studio/studio-client.tsx`
- Create: `src/app/studio/components/source-input.tsx`
- Create: `src/app/studio/components/scan-controls.tsx`
- Create: `src/app/studio/components/map7d-panel.tsx`
- Create: `src/app/studio/components/preview-panel.tsx`
- Create: `src/app/studio/components/fidelity-panel.tsx`
- Test: `tests/e2e/mirrorcraft-studio.spec.ts`

**Interfaces:**
- Consumes: LayerStack control/events and exported artifacts.
- Produces: user flow for source selection, mode selection, route scope, Start/Pause/Resume/Cancel, 7D map, preview/diff/fidelity, export.

- [ ] **Step 1: Write Playwright e2e tests for source entry, mode selection, Start → Pause → Resume, Cancel, route selection, and completed artifact summary.**
- [ ] **Step 2: Add responsive assertions at 1440x900, 768x1024, 390x844, and 360x800.**
- [ ] **Step 3: Implement Studio shell using existing MirrorCraft visual system; no legacy branding in UI text or identifiers.**
- [ ] **Step 4: Run e2e tests; expected PASS.**
- [ ] **Step 5: Commit `feat(studio): add MirrorCraft 7D reconstruction workspace`.**

### Task 12: CLI/commands, integration regression, branding/license gate

**Files:**
- Create: `scripts/mirror.mjs`
- Modify: `package.json`
- Modify: canonical agent skill/command source used by `npm run sync:skills`
- Modify generated agent command adapters through existing sync scripts
- Test: `tests/mirrorcraft/integration.test.ts`
- Test: `tests/mirrorcraft/branding-license.test.ts`

**Interfaces:**
- Consumes: all prior tasks.
- Produces commands `/mirror`, `/map7d`, `/deepscan`, `/code360`, `/codemap`, `/routes`, `/assets`, `/runtime`, `/datamap`, `/hostmap`, `/security`, `/aistack`, `/marketing`, `/reconstruct`, `/compare`, `/repair`, `/export` and CLI equivalents where practical.

- [ ] **Step 1: Write failing integration test that runs a small fixture from intake through SiteDNA → Code360 → reconstruction → validation → export.**
- [ ] **Step 2: Write branding test scanning UI/commands/module identifiers/primary docs for forbidden legacy product names while explicitly excluding license-required `LICENSE`/`NOTICE` attribution.**
- [ ] **Step 3: Add CLI and canonical agent commands, then regenerate adapters with the existing sync workflow.**
- [ ] **Step 4: Run `npm run sync:skills`, `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`; all must PASS.**
- [ ] **Step 5: Run the existing `npm run smoke:example` and verify no regression of the current baseline.**
- [ ] **Step 6: Commit `feat: complete MirrorCraft Engine v2 integration`.**

---

## Rollout / Merge Gates

1. Tasks 1–5 establish the canonical artifact model and must merge before reconstruction work.
2. Tasks 6–7 complete intelligence + resumability and are the minimum usable **7D analysis milestone**.
3. Tasks 8–10 complete reconstruction, validation, repair, and export and are the minimum usable **Engine v2 milestone**.
4. Tasks 11–12 provide the user-facing Studio and command integration and form the release candidate.
5. Every task requires focused tests plus `npm run typecheck`; Tasks 8–12 additionally require build validation when they touch generated/runtime application behavior.
6. Final release requires clean lint/typecheck/test/build plus existing smoke test and branding/license gate.

## Self-Review Result

- **Spec coverage:** all core spec modules, operating modes, concurrency/hash/invalidation, checkpoints, portable project, provider routing, security boundaries, Studio controls, validation, and repair are mapped to Tasks 1–12.
- **Type consistency:** all downstream modules consume canonical `ProjectSource`, `SiteDNA`, `Code360Graph`, artifact/checkpoint types defined at the start of the plan.
- **Review Focus coverage:** route explosion/loops (Task 3), secrets (Tasks 1/4/6/10), never-idle pages (Task 3), incremental invalidation (Task 7), repair regression (Task 9).
- **Scope control:** implementation is staged into four independently reviewable milestones rather than one large rewrite.
- **Migration safety:** existing `src/mirrorcraft/*` modules are extended in place where compatible; MirrorCraft branding and legal attribution are preserved.

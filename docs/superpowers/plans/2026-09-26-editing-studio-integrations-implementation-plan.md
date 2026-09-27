# Editing Studio + Integrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MirrorCraft's structured Editing Studio plus secure, provider-agnostic integration, zero-cost hosting, Google/Firebase, encryption, and deployment orchestration.

**Architecture:** Extend existing `SiteDNA`, `Code360`, `CodeTransparent`, `DeploymentClassifier`, `PublishGate`, and `ClonePipeline` rather than introducing competing representations. Edits are structured reversible operations; provider connections live behind adapters; secrets never enter model-visible project state; deployment selection is evidence-driven from source/runtime requirements and provider capability/limits.

**Tech Stack:** TypeScript 5, Next.js 16, React 19, GitHub Actions, Playwright, Web Crypto / Node `crypto`, provider adapters for GitHub Pages, Cloudflare Pages/Workers, Vercel, Netlify, Firebase Hosting/Google Cloud, Supabase/Neon where selected.

**Spec:** `docs/superpowers/specs/2026-09-26-editing-studio-free-hosting-design.md`

## Global Constraints

- Preserve existing `SiteDNA`, `Code360`, `PublishGate`, `DeploymentClassifier`, and `CodeTransparent` contracts unless a backwards-compatible extension is required.
- TypeScript strict mode must remain clean.
- No auth, paywall, CAPTCHA, subscription, DRM, or access-control bypass logic.
- Do not persist credentials, session cookies, API tokens, payment data, or private keys in project files, provenance logs, or model-visible context.
- `paywall` editing applies only to user-owned/authorized access-state UI and entitlement configuration.
- Every significant mutation must be reversible and provenance-backed.
- No provider may be marked zero-cost without an explicit free-tier capability record and quota metadata.
- Build/typecheck/lint remain release gates.
- Existing standalone Next.js build and GitHub Pages static-export build must both remain supported.

## Review Focus

1. A rename that crosses imports/routes/styles must update references atomically or fail without partial mutation.
2. A secret-like value entered into an integration form must never appear in project JSON, logs, generated source, or CodeTransparent evidence.
3. A dynamic/server-required clone must not be published to GitHub Pages/static-only hosting even if static build output happens to exist.
4. Undo/redo after restructure operations must restore component order, parent-child links, route references, and responsive overrides exactly.
5. Provider quota/capability data that is missing or stale must downgrade confidence and never silently classify a paid/unsupported feature as free.

---

## File Structure

### Editing core
- Create `src/mirrorcraft/editing/types.ts` — canonical edit target, operation, patch, viewport scope, verification types.
- Create `src/mirrorcraft/editing/registry.ts` — parameter registry for content/style/layout/color/gradient/button/shape/url/route/template/panel/access/metadata/asset/animation/form/advanced.
- Create `src/mirrorcraft/editing/mutation-engine.ts` — validate/apply atomic operations against editable project state.
- Create `src/mirrorcraft/editing/history.ts` — undo/redo/checkpoint model.
- Create `src/mirrorcraft/editing/restructure.ts` — move/wrap/unwrap/group/split/merge/reorder/nest/flatten component graph mutations.
- Create `src/mirrorcraft/editing/rename.ts` — dependency-aware symbol/route/component/token rename planning.
- Create `src/mirrorcraft/editing/compile-engine.ts` — compile verification request/result contracts and gate aggregation.

### Integration/security core
- Create `src/mirrorcraft/integrations/types.ts` — provider capabilities, auth mode, required scopes, connection health, quota metadata.
- Create `src/mirrorcraft/integrations/registry.ts` — provider registration/discovery.
- Create `src/mirrorcraft/integrations/secrets.ts` — opaque secret references only; no plaintext persistence.
- Create `src/mirrorcraft/security/crypto.ts` — application-layer encryption helpers for user-owned local bundles/settings.
- Create `src/mirrorcraft/security/redaction.ts` — secret/session/token redaction before logs/provenance/model context.
- Create `src/mirrorcraft/hosting/classifier.ts` — technical-fit + zero-cost capability filtering.
- Create `src/mirrorcraft/domain/types.ts` — provider subdomain/custom-domain/DNS verification model.

### Provider adapters
- Create `src/mirrorcraft/integrations/github.ts` — GitHub repo/pages/artifact capabilities.
- Create `src/mirrorcraft/integrations/cloudflare.ts` — Pages/Workers capability description and deployment contract.
- Create `src/mirrorcraft/integrations/vercel.ts` — Next/serverless capability description.
- Create `src/mirrorcraft/integrations/netlify.ts` — static/functions capability description.
- Create `src/mirrorcraft/integrations/google.ts` — Firebase Hosting / Google Cloud Run / Google OAuth capability description.
- Create `src/mirrorcraft/integrations/supabase.ts` — DB/Auth/Storage capability description.
- Create `src/mirrorcraft/integrations/neon.ts` — Postgres-only capability description.

### Tests
- Create focused `*.test.ts` files adjacent to modules, using Node's built-in test runner where practical to avoid unnecessary dependencies.
- Modify `package.json` only if a test script is required; prefer `node --test` with compiled/tsx-free tests only if executable in the existing toolchain. If that is not practical, use type-level/unit fixtures through the existing TypeScript build without adding a large framework.

---

### Task 1: Canonical Editing Operation Model

**Files:**
- Create: `src/mirrorcraft/editing/types.ts`
- Create: `src/mirrorcraft/editing/registry.ts`

**Interfaces:**
- Produces: `EditOperation`, `EditTarget`, `EditCategory`, `EditParameterDefinition`, `ViewportScope`, `EditVerification`, `getEditParameter(id)`.

- [ ] **Step 1: Write failing type/unit fixture** covering categories `rename`, `content`, `template`, `style`, `color`, `url`, `design`, `access`, `panel`, `button`, `shape`, `gradient`, `view`, `restructure`, `asset`, `animation`, `form`, `metadata`, `advanced`.
- [ ] **Step 2: Run `npm run typecheck`** and confirm fixture fails because canonical editing contracts do not exist.
- [ ] **Step 3: Implement canonical editing types and registry lookup** with explicit value types, viewport scope, reversible flag, and required verification level.
- [ ] **Step 4: Run `npm run typecheck && npm run lint`**; expected PASS.
- [ ] **Step 5: Commit** `feat: add structured editing operation registry`.

### Task 2: Atomic Mutation Engine + History

**Files:**
- Create: `src/mirrorcraft/editing/mutation-engine.ts`
- Create: `src/mirrorcraft/editing/history.ts`

**Interfaces:**
- Consumes: `EditOperation`.
- Produces: `planMutation(state, operations)`, `applyMutation(state, plan)`, `createEditCheckpoint`, `undoEdit`, `redoEdit`.

- [ ] **Step 1: Write failing fixtures** proving all-or-nothing apply and exact undo/redo for multi-operation edits.
- [ ] **Step 2: Run targeted type/test check**; expected FAIL.
- [ ] **Step 3: Implement immutable mutation planning with before/after snapshots and affected-node IDs**.
- [ ] **Step 4: Verify tests/typecheck/lint PASS**.
- [ ] **Step 5: Commit** `feat: add atomic edit mutation and history engine`.

### Task 3: Dependency-Aware Rename + URL Migration

**Files:**
- Create: `src/mirrorcraft/editing/rename.ts`
- Modify: `src/mirrorcraft/code360/index.ts`

**Interfaces:**
- Consumes: `Code360Graph`, rename request.
- Produces: `planRename`, `RenameImpact` with imports/exports/routes/styles/assets/metadata references.

- [ ] **Step 1: Write failing fixture** for component rename and `/pricing` → `/plans` route migration across navigation, links, canonical metadata, and Code360 references.
- [ ] **Step 2: Verify failure before implementation**.
- [ ] **Step 3: Implement graph-backed impact discovery and atomic rename plan**; no blind regex-only rename.
- [ ] **Step 4: Verify route/component rename fixtures and full typecheck PASS**.
- [ ] **Step 5: Commit** `feat: add dependency-aware rename planning`.

### Task 4: Restructure Engine

**Files:**
- Create: `src/mirrorcraft/editing/restructure.ts`
- Modify: `src/mirrorcraft/site-dna/schema.ts` only for backwards-compatible structural metadata if needed.

**Interfaces:**
- Produces: `moveComponent`, `wrapComponents`, `unwrapComponent`, `reorderChildren`, `groupComponents`, `flattenComponent`.

- [ ] **Step 1: Write failing fixtures** for move/wrap/reorder and exact undo restoration.
- [ ] **Step 2: Run verification and observe FAIL**.
- [ ] **Step 3: Implement graph-safe restructure operations** preserving parent/children/route membership and responsive overrides.
- [ ] **Step 4: Run fixtures + typecheck + lint**; expected PASS.
- [ ] **Step 5: Commit** `feat: add component restructure operations`.

### Task 5: Compile Engine + Editing Release Gate

**Files:**
- Create: `src/mirrorcraft/editing/compile-engine.ts`
- Modify: `src/mirrorcraft/publish/index.ts`
- Modify: `src/mirrorcraft/verification-engine/index.ts`

**Interfaces:**
- Produces: `CompileCheck`, `CompileReport`, `evaluateCompileReport`.

- [ ] **Step 1: Write failing fixture** proving publish is blocked for failed typecheck/lint/build/route/console checks.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement compile report aggregation and connect to existing PublishGate without duplicating verification schemas**.
- [ ] **Step 4: Run `npm run check`**; expected PASS.
- [ ] **Step 5: Commit** `feat: connect editing compile verification to publish gate`.

### Task 6: Secret References + Redaction

**Files:**
- Create: `src/mirrorcraft/integrations/secrets.ts`
- Create: `src/mirrorcraft/security/redaction.ts`

**Interfaces:**
- Produces: opaque `SecretRef`, `SecretResolver` interface, `redactSensitive(input)`.

- [ ] **Step 1: Write failing fixtures** with API keys, bearer tokens, cookies, OAuth codes, private-key headers, and common connection strings; assert output contains no plaintext secret.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement opaque refs and deterministic redaction**; never serialize resolver values.
- [ ] **Step 4: Run fixtures + grep generated output for seeded secrets**; expected zero matches.
- [ ] **Step 5: Commit** `feat: add secret references and redaction boundaries`.

### Task 7: Application-Layer Encryption for Owned Local Data

**Files:**
- Create: `src/mirrorcraft/security/crypto.ts`

**Interfaces:**
- Produces: `encryptBundle(plaintext, keyMaterial)`, `decryptBundle(envelope, keyMaterial)`, versioned `EncryptedEnvelope`.

- [ ] **Step 1: Write failing round-trip and tamper-detection fixtures**.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement authenticated encryption using Web Crypto / Node crypto with random nonce and versioned envelope**; no custom cipher design.
- [ ] **Step 4: Verify round-trip PASS and modified ciphertext/auth tag FAILS closed**.
- [ ] **Step 5: Commit** `feat: add authenticated encryption for owned project bundles`.

### Task 8: Integration Registry + Provider Capability Model

**Files:**
- Create: `src/mirrorcraft/integrations/types.ts`
- Create: `src/mirrorcraft/integrations/registry.ts`

**Interfaces:**
- Produces: `IntegrationProvider`, `ProviderCapability`, `ProviderQuota`, `registerProvider`, `listCompatibleProviders`.

- [ ] **Step 1: Write failing fixture** requiring explicit capability + free-tier/quota metadata and `unknown` when not verified.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement provider registry with freshness/confidence fields**.
- [ ] **Step 4: Typecheck/lint PASS**.
- [ ] **Step 5: Commit** `feat: add provider integration registry`.

### Task 9: Hosting Classifier + Zero-Cost Filter

**Files:**
- Create: `src/mirrorcraft/hosting/classifier.ts`
- Modify: `src/mirrorcraft/deployment-classifier/from-source.ts`

**Interfaces:**
- Consumes: deployment recommendation + provider capability records.
- Produces: `HostingCandidate[]` with compatibility, zero-cost eligibility, blockers, quota warnings, confidence.

- [ ] **Step 1: Write failing fixtures** for static-only, serverless, full-server, and missing/stale quota metadata.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement technical-fit filtering before cost filtering; never choose static-only provider for server-required app**.
- [ ] **Step 4: Verify fixtures + typecheck PASS**.
- [ ] **Step 5: Commit** `feat: add evidence-driven hosting classifier`.

### Task 10: GitHub / Cloudflare / Vercel / Netlify Provider Adapters

**Files:**
- Create: `src/mirrorcraft/integrations/github.ts`
- Create: `src/mirrorcraft/integrations/cloudflare.ts`
- Create: `src/mirrorcraft/integrations/vercel.ts`
- Create: `src/mirrorcraft/integrations/netlify.ts`

**Interfaces:**
- Produces provider capability descriptors and deployment adapter contracts; execution credentials supplied only through `SecretRef`/runtime connector boundary.

- [ ] **Step 1: Write failing capability fixtures** showing GitHub Pages static-only and others conditional by runtime features.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement descriptors/adapters without embedding credentials or assuming paid quotas**.
- [ ] **Step 4: Run typecheck/lint/build PASS**.
- [ ] **Step 5: Commit** `feat: add core hosting provider adapters`.

### Task 11: Google Integration Adapter

**Files:**
- Create: `src/mirrorcraft/integrations/google.ts`
- Create: `src/mirrorcraft/domain/types.ts` if not already created by this point.

**Interfaces:**
- Produces capability records for Firebase Hosting, Firebase Auth/client services, Google OAuth, and Cloud Run; OAuth credentials remain external/opaque.

- [ ] **Step 1: Write failing fixtures** for Firebase static hosting, OAuth-required integration, and Cloud Run server-runtime compatibility.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement Google capability model with explicit distinction between Spark/no-cost-compatible services and billing-account-dependent services**.
- [ ] **Step 4: Verify no OAuth client secret can enter serialized provider config; typecheck/lint PASS**.
- [ ] **Step 5: Commit** `feat: add Google and Firebase integration capabilities`.

### Task 12: Supabase + Neon Backend Adapters

**Files:**
- Create: `src/mirrorcraft/integrations/supabase.ts`
- Create: `src/mirrorcraft/integrations/neon.ts`

**Interfaces:**
- Produces capability records for DB/Auth/Storage/Realtime (Supabase) and Postgres (Neon).

- [ ] **Step 1: Write failing fixtures** for DB-only vs DB+Auth+Storage selection.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement capability descriptors using opaque connection refs**.
- [ ] **Step 4: Typecheck/lint PASS**.
- [ ] **Step 5: Commit** `feat: add backend provider capability adapters`.

### Task 13: Domain and DNS Planning

**Files:**
- Create: `src/mirrorcraft/domain/types.ts` if not yet present
- Create: `src/mirrorcraft/domain/planner.ts`

**Interfaces:**
- Produces: `DomainPlan` for provider subdomain or user-owned custom domain; `DnsRecordPlan` only, no hidden registrar purchase/action.

- [ ] **Step 1: Write failing fixtures** for provider subdomain, apex custom domain, `www`, and verification failure.
- [ ] **Step 2: Verify FAIL**.
- [ ] **Step 3: Implement domain plan and validation state without claiming ownership until provider verification succeeds**.
- [ ] **Step 4: Typecheck/lint PASS**.
- [ ] **Step 5: Commit** `feat: add domain and DNS planning`.

### Task 14: Studio Integration Surface

**Files:**
- Create/modify focused `src/app/studio/**` components after inspecting the existing Studio tree.

**Interfaces:**
- Consumes editing registry, mutation/history engine, hosting candidates, compile report, integration health.
- Produces UI tabs: `Content`, `Style`, `Layout`, `Colors`, `Gradient`, `Responsive`, `Behavior`, `Access`, `Advanced`, plus bottom surfaces `Code`, `Diff`, `History`, `Compile`, `Integrations`, `Publish`.

- [ ] **Step 1: Inspect existing Studio files and write a minimal interaction test/fixture for selected component → inspector parameters → mutation preview**.
- [ ] **Step 2: Verify test/fixture fails before UI wiring**.
- [ ] **Step 3: Implement smallest coherent Studio wiring; no provider-specific secrets in React state beyond opaque refs**.
- [ ] **Step 4: Run `npm run check` and Playwright smoke path for edit → undo → compile → hosting recommendation**.
- [ ] **Step 5: Commit** `feat: wire editing and integrations into Studio`.

### Task 15: End-to-End Verification

**Files:**
- Modify: `.github/workflows/verify.yml` only if extra smoke command is needed.
- Create: focused smoke script under `scripts/` if required.

**Interfaces:**
- Produces a reproducible verification path covering edit, compile, hosting classification, secret redaction, and publish blocking.

- [ ] **Step 1: Add smoke scenario** for a static clone and a server-required clone.
- [ ] **Step 2: Run `npm run check` plus smoke scenario**; expected PASS.
- [ ] **Step 3: Verify static clone includes GitHub Pages among compatible zero-cost targets and server clone excludes it**.
- [ ] **Step 4: Seed fake secret values and verify repository/generated reports contain zero plaintext matches**.
- [ ] **Step 5: Commit** `test: verify editing integrations and secure publishing lifecycle`.

## Self-Review Results

- Spec coverage: editing parameters, mutation/history, rename/restructure, compile, hosting, free-tier selection, domains, Google, backend providers, encryption, redaction, and publish integration are covered.
- Type consistency: provider adapters consume shared `IntegrationProvider`; hosting classifier consumes existing deployment recommendation plus provider capabilities; editing operations stay separate from provider configs.
- Scope control: no payment automation, registrar purchasing, access-control bypass, or third-party content decryption is included.
- Review-focus coverage: each of the five global failure modes is pinned to Tasks 2/3, 6/7, 9/10, 4, and 8/9 respectively.
- Proportion: plan specifies interfaces/tests/verification and avoids implementation-body transcripts.

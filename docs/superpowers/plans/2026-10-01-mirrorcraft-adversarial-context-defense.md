# MirrorCraft Adversarial Context Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add evidence-backed prompt-injection defenses, context isolation, tool-capability authorization, adversarial regression tests, and release gating so external content can be reconstructed faithfully without becoming executable agent instruction.

**Architecture:** Extend the existing clone pipeline and kernel rather than introducing a parallel runtime. External browser/repository/network content is classified and preserved as evidence, then wrapped by a context firewall; only trusted task sources may authorize mutating tools. Adversarial verification runs after ordinary verification and contributes to release readiness.

**Tech Stack:** TypeScript 5, Next.js 16, React 19, existing MirrorCraft kernel/policy modules, Node.js 20+, existing smoke-test pattern, Playwright where browser fixtures are required.

**Spec:** `docs/superpowers/specs/2026-10-01-mirrorcraft-adversarial-context-defense-design.md`

## Global Constraints

- Preserve the invariant `CONTENT != COMMAND`.
- `external-content.executableInstruction = false` by default.
- Repository content is non-authoritative unless explicitly promoted by project policy.
- Hostile visible text must remain available for DOM/render fidelity; detection must not delete it from reconstruction evidence.
- External content may not directly authorize terminal, git write, network-write, deployment, policy mutation, or persistent agent state.
- Existing secret redaction remains authoritative for already-present secrets; prompt-defense separately detects secret-acquisition requests.
- Every security-relevant allow/block decision must carry evidence IDs.
- Baselines marked `UNMEASURED` must never count as passing.
- Do not add bypass logic for authentication, bot challenges, model safety, or website controls.
- Existing lint, typecheck, build, clone smoke tests, runtime smoke tests, integration smoke tests, and restriction smoke tests must continue to pass.

## Review Focus

1. **Benign technical prose that discusses policies or authorization** must remain usable as data and not be over-blocked. Pin with benign-control tests in Task 2.
2. **Quoted or encoded hostile-looking text** must be detected as risky evidence without becoming executable context. Pin with wrapper/mutation tests in Tasks 2 and 6.
3. **Mixed-trust context** must preserve operator instructions while isolating browser/repository/network chunks. Pin with envelope-ordering tests in Task 3.
4. **A trusted task citing hostile evidence** must not inherit the hostile evidence's authority to invoke tools. Pin with provenance-aware capability tests in Task 4.
5. **Security verification unavailable or unmeasured** must block verified release state rather than silently passing. Pin with readiness/release tests in Task 7.

---

## File Structure

### New

- `src/mirrorcraft/prompt-defense/types.ts` — trust tiers, signal types, assessment and evidence contracts.
- `src/mirrorcraft/prompt-defense/instruction-signals.ts` — deterministic semantic-signal rules and scoring inputs.
- `src/mirrorcraft/prompt-defense/classifier.ts` — assessment aggregation and disposition.
- `src/mirrorcraft/prompt-defense/trust-boundary.ts` — executable-instruction eligibility by provenance.
- `src/mirrorcraft/prompt-defense/evidence.ts` — security evidence creation helpers.
- `src/mirrorcraft/prompt-defense/index.ts` — public exports.
- `src/mirrorcraft/context-firewall/types.ts` — context chunk/envelope contracts.
- `src/mirrorcraft/context-firewall/builder.ts` — safe model-context construction.
- `src/mirrorcraft/context-firewall/index.ts` — public exports.
- `src/mirrorcraft/capability-firewall/types.ts` — tool-authorization request/decision contracts.
- `src/mirrorcraft/capability-firewall/authorize.ts` — provenance-aware capability authorization.
- `src/mirrorcraft/capability-firewall/index.ts` — public exports.
- `src/mirrorcraft/adversarial-eval/types.ts` — test-case, result, baseline and metric contracts.
- `src/mirrorcraft/adversarial-eval/corpus.ts` — defensive synthetic corpus and benign controls.
- `src/mirrorcraft/adversarial-eval/mutations.ts` — bounded formatting/wrapper mutations.
- `src/mirrorcraft/adversarial-eval/runner.ts` — evaluation runner.
- `src/mirrorcraft/adversarial-eval/metrics.ts` — recall/FP/boundary metrics.
- `src/mirrorcraft/adversarial-eval/baseline.ts` — measured/unmeasured baseline state.
- `src/mirrorcraft/adversarial-eval/index.ts` — public exports.
- `scripts/smoke-adversarial-context.mjs` — Node smoke harness for compiled contracts/fixtures.

### Modify

- `src/mirrorcraft/kernel-core/index.ts` — add instruction provenance and optional tool capability metadata without breaking existing callers.
- `src/mirrorcraft/policy/restrictions.ts` — add `ai-context` and `agent-tool` scopes/codes and mapping helpers.
- `src/mirrorcraft/clone-pipeline/index.ts` — add `trust-analysis` and `adversarial-verify` stages.
- `src/mirrorcraft/clone-readiness/index.ts` — require measured adversarial verification for AI-generated/repaired outputs.
- `src/mirrorcraft/release-manifest/index.ts` — carry adversarial verification status/evidence.
- `src/mirrorcraft/code360/index.ts` — surface AI-trust evidence summary without chain-of-thought.
- `package.json` — add `smoke:adversarial` script.

---

### Task 1: Trust Model and Evidence Contracts

**Files:**
- Create: `src/mirrorcraft/prompt-defense/types.ts`
- Create: `src/mirrorcraft/prompt-defense/trust-boundary.ts`
- Create: `src/mirrorcraft/prompt-defense/evidence.ts`
- Create: `src/mirrorcraft/prompt-defense/index.ts`
- Modify: `src/mirrorcraft/kernel-core/index.ts`
- Test: `src/mirrorcraft/prompt-defense/type-fixture.ts`

**Interfaces:**
- Produces: `TrustTier`, `InjectionSignal`, `InjectionAssessment`, `SecurityEvidence`, `isExecutableInstructionSource(trust: TrustTier): boolean`, `createSecurityEvidence(input): SecurityEvidence`.
- Kernel extension: `AgentInstruction.source: TrustTier`, `AgentInstruction.executableInstruction: boolean`, optional provenance fields; defaults for old callers must remain valid.

- [ ] **Step 1: Write the failing type/runtime fixture**
  - Assert `external-content` and `repository` are not executable by default.
  - Assert `kernel`, `project-policy`, and `operator` are executable sources.
  - Assert evidence creation preserves origin, hash, confidence, and optional selector/path/line.

- [ ] **Step 2: Run targeted typecheck**
  - Run: `npm run typecheck`
  - Expected: FAIL because new contracts/functions do not exist.

- [ ] **Step 3: Implement the minimal trust/evidence contracts**
  - Exact signatures:
    - `isExecutableInstructionSource(trust: TrustTier): boolean`
    - `createSecurityEvidence(input: SecurityEvidenceInput): SecurityEvidence`
  - Extend kernel types additively; do not alter phase order or mutation behavior.

- [ ] **Step 4: Re-run typecheck and existing kernel-related smoke checks**
  - Run: `npm run typecheck && npm run smoke:runtime`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `feat: add prompt-defense trust contracts`

---

### Task 2: Prompt-Defense Classifier

**Files:**
- Create: `src/mirrorcraft/prompt-defense/instruction-signals.ts`
- Create: `src/mirrorcraft/prompt-defense/classifier.ts`
- Test: `src/mirrorcraft/prompt-defense/classifier-fixture.ts`

**Interfaces:**
- Consumes: `InjectionSignal`, `InjectionAssessment`, `SecurityEvidence` from Task 1.
- Produces: `classifyExternalInstruction(input: ClassificationInput): InjectionAssessment`.

- [ ] **Step 1: Write failing classifier fixtures**
  - Positive semantic classes: identity override, authority override, instruction-priority change, policy redefinition, refusal suppression, tool permission escalation, persistent instruction, fake authorization, reasoning redirection, output coercion, secret acquisition, environment manipulation.
  - Benign controls: documentation that merely describes authorization, quoted security examples, ordinary technical docs, UI copy containing words like `policy`, `role`, or `token`.
  - Assert visible source content is returned/retained separately from disposition.

- [ ] **Step 2: Run fixture through typecheck/smoke harness and verify failure**
  - Run: `npm run typecheck`
  - Expected: FAIL on missing classifier/signals.

- [ ] **Step 3: Implement deterministic signal extraction and bounded score aggregation**
  - Exact signature: `classifyExternalInstruction(input: ClassificationInput): InjectionAssessment`.
  - Classification thresholds must be constants exported for tests.
  - Do not depend on exact strings from external jailbreak repositories.

- [ ] **Step 4: Verify positive and benign-control behavior**
  - Run: `npm run typecheck`
  - Expected: PASS with benign controls below blocking threshold.

- [ ] **Step 5: Commit**
  - Commit message: `feat: classify untrusted instruction signals`

---

### Task 3: Context Firewall

**Files:**
- Create: `src/mirrorcraft/context-firewall/types.ts`
- Create: `src/mirrorcraft/context-firewall/builder.ts`
- Create: `src/mirrorcraft/context-firewall/index.ts`
- Test: `src/mirrorcraft/context-firewall/context-firewall-fixture.ts`

**Interfaces:**
- Consumes: `TrustTier`, `InjectionAssessment`, `isExecutableInstructionSource`.
- Produces: `buildContextEnvelope(chunks: ContextChunk[]): ContextEnvelope`.

- [ ] **Step 1: Write failing envelope fixtures**
  - Mixed input: operator instruction + browser content + repository content + generated notes.
  - Assert only eligible trusted sources enter `instructions`.
  - Assert browser/repository/network content enters delimited `evidence` sections with provenance IDs.
  - Assert high-risk external content can be quarantined/excluded from model context while raw reconstruction evidence remains available elsewhere.

- [ ] **Step 2: Verify failure**
  - Run: `npm run typecheck`
  - Expected: FAIL on missing context-firewall contracts.

- [ ] **Step 3: Implement context envelope construction**
  - Exact signature: `buildContextEnvelope(chunks: readonly ContextChunk[]): ContextEnvelope`.
  - Preserve source order within each channel; never concatenate untrusted data into the instruction channel.

- [ ] **Step 4: Verify envelope invariants**
  - Run: `npm run typecheck`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `feat: isolate untrusted model context`

---

### Task 4: Capability Firewall

**Files:**
- Create: `src/mirrorcraft/capability-firewall/types.ts`
- Create: `src/mirrorcraft/capability-firewall/authorize.ts`
- Create: `src/mirrorcraft/capability-firewall/index.ts`
- Modify: `src/mirrorcraft/kernel-core/index.ts`
- Test: `src/mirrorcraft/capability-firewall/authorize-fixture.ts`

**Interfaces:**
- Consumes: `TrustTier`, kernel `ToolClass`, evidence IDs.
- Produces: `authorizeToolCapability(request: ToolAuthorizationRequest): ToolAuthorizationDecision`.

- [ ] **Step 1: Write failing authorization fixtures**
  - Deny external-content origin for terminal, git mutation, network-write, deployment, and persistent-state changes.
  - Allow read-only analysis when the tool capability explicitly permits untrusted evidence.
  - Confirm a trusted operator task that references hostile evidence does not inherit the evidence's trust tier.
  - Require verification metadata for mutating actions where kernel tool metadata says `requiresVerification`.

- [ ] **Step 2: Verify failure**
  - Run: `npm run typecheck`
  - Expected: FAIL on missing authorization contracts.

- [ ] **Step 3: Implement capability authorization**
  - Exact signature: `authorizeToolCapability(request: ToolAuthorizationRequest): ToolAuthorizationDecision`.
  - Decision must include `allowed`, `reason`, and `evidenceIds`.

- [ ] **Step 4: Verify capability fixtures and kernel compatibility**
  - Run: `npm run typecheck && npm run smoke:runtime`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `feat: gate agent capabilities by provenance`

---

### Task 5: Restrictions Integration

**Files:**
- Modify: `src/mirrorcraft/policy/restrictions.ts`
- Test: extend `scripts/smoke-restrictions.mjs`

**Interfaces:**
- Consumes: classifier/context/capability decisions from Tasks 2–4.
- Produces:
  - `restrictionsFromInjectionAssessment(...)`
  - `restrictionsFromToolAuthorization(...)`
  - new scopes `ai-context`, `agent-tool`.

- [ ] **Step 1: Add failing smoke cases**
  - High-risk external instruction produces block restriction with evidence IDs.
  - Suspicious-but-benign/low-risk content produces warning or no restriction according to classifier disposition.
  - Denied mutating tool request produces `tool-escalation-request` or `instruction-boundary-violation`.
  - Secret-acquisition request is distinct from secret-redaction violation.

- [ ] **Step 2: Run restriction smoke test and confirm failure**
  - Run: `npm run smoke:restrictions`
  - Expected: FAIL on missing codes/helpers.

- [ ] **Step 3: Implement additive restriction mappings**
  - Do not change existing deployment/access/secret restriction semantics.

- [ ] **Step 4: Verify**
  - Run: `npm run smoke:restrictions && npm run typecheck`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `feat: integrate AI context restrictions`

---

### Task 6: Adversarial Corpus, Mutations, and Metrics

**Files:**
- Create: `src/mirrorcraft/adversarial-eval/types.ts`
- Create: `src/mirrorcraft/adversarial-eval/corpus.ts`
- Create: `src/mirrorcraft/adversarial-eval/mutations.ts`
- Create: `src/mirrorcraft/adversarial-eval/runner.ts`
- Create: `src/mirrorcraft/adversarial-eval/metrics.ts`
- Create: `src/mirrorcraft/adversarial-eval/baseline.ts`
- Create: `src/mirrorcraft/adversarial-eval/index.ts`
- Create: `scripts/smoke-adversarial-context.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `classifyExternalInstruction`, `buildContextEnvelope`, `authorizeToolCapability`.
- Produces:
  - `runAdversarialEvaluation(cases): AdversarialEvaluationReport`
  - `computeAdversarialMetrics(results): AdversarialMetrics`
  - `evaluateBaseline(metrics, baseline): BaselineDecision`.

- [ ] **Step 1: Write failing smoke corpus**
  - Synthetic positive categories from the spec.
  - Benign controls.
  - Bounded mutations: case, whitespace, Markdown quote, HTML wrapper/comment, JSON string value, SVG text, ARIA/data-attribute wrapper, nested delimiters.
  - Synthetic canary test value; assert it is never emitted by context/tool outputs.

- [ ] **Step 2: Run smoke test and verify failure**
  - Run: `npm run smoke:adversarial`
  - Expected: FAIL because module/script is missing.

- [ ] **Step 3: Implement corpus/mutation/runner contracts**
  - Mutations must transform defensive fixtures only; do not add a generator intended to discover bypasses against external models.

- [ ] **Step 4: Implement metrics and baseline semantics**
  - Required metrics: attack recall, benign false-positive rate, mutation robustness, canary leakage, tool-escalation success rate, context-boundary escape rate, secret leakage rate, provenance coverage.
  - `UNMEASURED` => non-passing.

- [ ] **Step 5: Verify**
  - Run: `npm run smoke:adversarial && npm run typecheck`
  - Expected: PASS; canary leakage, tool escalation, context escape, and secret leakage are zero on the synthetic baseline.

- [ ] **Step 6: Commit**
  - Commit message: `test: add adversarial context regression harness`

---

### Task 7: Clone Pipeline, Readiness, and Release Gating

**Files:**
- Modify: `src/mirrorcraft/clone-pipeline/index.ts`
- Modify: `src/mirrorcraft/clone-readiness/index.ts`
- Modify: `src/mirrorcraft/release-manifest/index.ts`
- Test: extend `scripts/smoke-clone-example.mjs` and/or lifecycle smoke fixture.

**Interfaces:**
- Consumes: adversarial evaluation status/evidence.
- Produces: clone stages `trust-analysis` and `adversarial-verify`; release/readiness state that distinguishes `measured-pass`, `measured-fail`, and `unmeasured`.

- [ ] **Step 1: Write failing lifecycle cases**
  - Stage order includes `trust-analysis` immediately after `capture`.
  - Stage order includes `adversarial-verify` after `verify` and before `release`.
  - AI-generated/repaired clone with unmeasured adversarial verification is not release-ready.
  - Measured failed adversarial verification blocks release with evidence IDs.
  - Non-AI/static fixture follows documented readiness policy without inventing a pass.

- [ ] **Step 2: Run lifecycle/clone smoke tests and confirm failure**
  - Run: `npm run smoke:example && npm run smoke:lifecycle`
  - Expected: FAIL on new stage/readiness expectations.

- [ ] **Step 3: Implement stage order and readiness state**
  - Update `CloneStage`, `CLONE_STAGE_ORDER`, readiness evaluation, and release manifest contracts additively.

- [ ] **Step 4: Verify**
  - Run: `npm run smoke:example && npm run smoke:lifecycle && npm run typecheck`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `feat: gate clone release on adversarial verification`

---

### Task 8: Code360 AI Trust Evidence Surface

**Files:**
- Modify: `src/mirrorcraft/code360/index.ts`
- Test: add/extend Code360 fixture under `src/mirrorcraft/code360/`.

**Interfaces:**
- Consumes: `SecurityEvidence`, `InjectionAssessment`, restriction IDs, tool decisions.
- Produces: `AITrustSummary` containing source/origin, trust tier, signals, confidence, disposition, related restriction IDs, and linked evidence IDs.

- [ ] **Step 1: Write failing summary fixture**
  - Assert no hidden reasoning/chain-of-thought field exists.
  - Assert source path/page/selector, trust tier, signals, confidence, disposition, restriction IDs and evidence links are retained.

- [ ] **Step 2: Verify failure**
  - Run: `npm run typecheck`
  - Expected: FAIL on missing AI-trust summary contract.

- [ ] **Step 3: Implement evidence summary integration**
  - Keep Code360 output evidence-oriented and serializable.

- [ ] **Step 4: Verify**
  - Run: `npm run typecheck`
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Commit message: `feat: expose AI trust evidence in Code360`

---

### Task 9: Full Regression Verification

**Files:**
- Modify only if a regression discovered by verification requires a scoped fix.

**Interfaces:**
- Consumes: all preceding tasks.
- Produces: verified branch state and evidence that existing MirrorCraft behavior remains intact.

- [ ] **Step 1: Run focused adversarial and policy checks**
  - Run: `npm run smoke:adversarial && npm run smoke:restrictions && npm run smoke:runtime`
  - Expected: PASS.

- [ ] **Step 2: Run existing integration/lifecycle checks**
  - Run: `npm run smoke:example && npm run smoke:integrations && npm run smoke:providers && npm run smoke:lifecycle`
  - Expected: PASS.

- [ ] **Step 3: Run complete project verification**
  - Run: `npm run check`
  - Expected: lint PASS, typecheck PASS, build PASS.

- [ ] **Step 4: Inspect failures before changing code**
  - Classify each failure as new-regression, pre-existing, environment-only, or spec conflict; fix only new regressions attributable to this branch.

- [ ] **Step 5: Commit any verification-only repairs**
  - Commit message: `fix: resolve adversarial defense regressions`

---

## Self-Review Result

- **Spec coverage:** P0 trust, classifier, context firewall, capability firewall, restrictions, secret-acquisition distinction; P1 corpus, mutations, canary, metrics, baseline; pipeline/release integration and Code360 evidence are all mapped to tasks.
- **Type consistency:** Trust tiers and evidence IDs originate in Task 1 and are consumed consistently by Tasks 2–8.
- **Review Focus coverage:** benign prose, wrappers/encoding, mixed trust, trusted-task/hostile-evidence separation, and unmeasured release state each have explicit tests.
- **Scope boundary:** independent verifier-agent and historical attack-memory remain deferred per Phase D of the approved design; this plan does not silently expand into them.
- **Safety boundary:** external jailbreak corpora are treated only as defensive evaluation inspiration/fixtures; production behavior does not reproduce or operationalize jailbreak bypass mechanisms.

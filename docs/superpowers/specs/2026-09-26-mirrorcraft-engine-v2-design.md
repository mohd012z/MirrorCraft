# MirrorCraft Engine v2 — 7D / Code360 / DeepScan Design

Date: 2026-09-26
Status: Design approved in chat; implementation not started

## 1. Purpose

MirrorCraft Engine v2 turns MirrorCraft into a structured website/project intelligence and reconstruction engine. It must analyze permitted public web surfaces and local/project files, normalize them into an inspectable intermediate representation, rebuild supported frontends, validate fidelity, and iteratively repair mismatches.

The product-facing identity is exclusively **MirrorCraft**. Legacy project/product brand names must not appear in UI, commands, module names, generated marketing copy, or primary documentation. License-required attribution may remain only where legally required, such as LICENSE/NOTICE.

## 2. Goals

MirrorCraft v2 must:

1. Accept multiple source formats: URL, screenshot/image, HTML, ZIP/project, DOM snapshot, selected recordings, and supported source projects.
2. Analyze the target across seven dimensions: visual, code, runtime behavior, data/API, infrastructure hints, security posture, and reconstruction readiness.
3. Produce canonical machine-readable artifacts (`SiteDNA`, `Code360`, route maps, asset maps, security maps, fidelity reports).
4. Support FastPath, Balanced, DeepScan, and MAX analysis modes.
5. Reconstruct into reusable HTML/React/Next.js-first outputs with optional Tailwind and additional adapters.
6. Validate across desktop/tablet/mobile viewports.
7. Repair only affected nodes/components where possible instead of regenerating entire pages.
8. Support local-first execution with optional cloud AI fallback.
9. Cache aggressively, checkpoint progress, resume safely, and avoid repeated work.
10. Protect secrets, credentials, protected data, and private infrastructure.

## 3. Non-goals / boundaries

MirrorCraft v2 is not designed to:

- break encryption or DRM;
- crack passwords or protected binaries;
- bypass authentication, paywalls, access controls, CAPTCHA, or anti-bot protections;
- discover hidden/private origin infrastructure behind a CDN by evasion;
- exfiltrate credentials, session tokens, private API keys, payment data, or personal data;
- reconstruct unknown proprietary server-side behavior from observation alone;
- impersonate third-party brands or enable phishing.

When encrypted or inaccessible data is encountered, the engine records metadata and confidence only.

## 4. 7D model

### D1 — Surface / Visual

Captures what is visibly rendered:

- layout and geometry;
- typography;
- colors and gradients;
- spacing and sizing;
- icons, SVG, images, video, animations;
- desktop/tablet/mobile states;
- light/dark variants where observable.

Primary modules: `PrismCapture`, `ViewMatrix`, `AssetVault`, `FidelityLab`.

### D2 — Code Structure

Maps supported project and browser-delivered code:

- HTML/CSS/JS/TS/React/Next/Vue;
- JSON/XML/YAML/TOML;
- VB/VBS/C#/C/C++ where supplied as project files;
- Python/PHP/Java/Kotlin/Swift/SQL where supplied as project files;
- imports/exports/functions/classes/components/dependencies.

Primary module: `Code360`.

### D3 — Behavior / Runtime

Maps observable interactions and state transitions:

- click, hover, focus, active;
- scroll and sticky behavior;
- dropdown, modal, tabs, accordion;
- forms;
- animation triggers;
- fetch/XHR/WebSocket/EventSource;
- workers/service workers;
- storage events and observable state changes.

Primary modules: `MotionMap`, `RuntimeMap`.

### D4 — Data / API

Maps data flow hints without revealing secrets:

- client state;
- REST/GraphQL/WebSocket endpoints;
- service layers;
- database/ORM hints in provided source;
- data contracts where inferable.

Possible hints include PostgreSQL, MySQL, SQLite, MongoDB, Redis, Supabase, Firebase, Prisma, Drizzle, etc.

### D5 — Infrastructure

Maps only publicly observable infrastructure metadata:

- DNS/CNAME/A/AAAA where public;
- CDN and hosting hints;
- TLS certificate metadata;
- public response headers;
- external SaaS dependencies;
- analytics and AI provider hints.

No hidden-origin discovery or bypass behavior.

### D6 — Security

Defensive analysis only:

- CSP/CORS/security headers;
- auth and cookie handling patterns;
- client storage usage;
- unsafe DOM operations;
- dependency risk metadata;
- public secret-pattern detection with redaction;
- third-party script inventory.

Severity: P0 Critical, P1 High, P2 Medium, P3 Low, P4 Informational.

### D7 — Reconstruction

Consumes D1–D6 artifacts and generates editable output:

- HTML/CSS;
- HTML/Tailwind;
- React;
- React/Tailwind;
- Next.js/Tailwind (default);
- optional adapters for Vue/static bundles;
- ZIP / Git branch/export artifacts;
- SiteDNA and Code360 JSON reports.

## 5. Top-level architecture

```text
Input
  |
  v
Intake
  |
  +--> PrismCapture
  +--> RouteAtlas
  +--> AssetVault
  +--> SourceScanner
          |
          v
       SiteDNA
          |
          v
       Code360
          |
    +-----+------+---------+---------+
    |            |         |         |
 MotionMap    DataMap   HostMap  SecurityGraph
    |            |         |         |
    +------------+----+----+---------+
                      |
                      v
                  LayerStack
                      |
                      v
                  RebuildCore
                      |
                      v
                   ViewMatrix
                      |
                      v
                  FidelityLab
                      |
                      v
                   RepairLoop
                      |
                      v
                  FormatBridge
```

## 6. Module layout

Target folder structure:

```text
src/
  mirrorcraft/
    intake/
    prism-capture/
    route-atlas/
    source-scanner/
    site-dna/
    code360/
    layer-stack/
    asset-vault/
    motion-map/
    data-map/
    host-map/
    security-graph/
    view-matrix/
    rebuild-core/
    fidelity-lab/
    repair-loop/
    format-bridge/
    fast-path/
    deep-scan/
    providers/
    cache/
    checkpoints/
    shared/

src/app/studio/
```

### 6.1 Intake

Normalizes input into a `ProjectSource` descriptor.

Supported source kinds:

- `url`
- `screenshot`
- `image`
- `html`
- `zip`
- `project`
- `dom-snapshot`
- `recording`

### 6.2 PrismCapture

Browser capture layer using Playwright/Chromium.

Responsibilities:

- page load and stable-state detection;
- DOM snapshot;
- computed style capture;
- full-page and viewport screenshots;
- CSS variables;
- font references;
- SVG/image/video inventory;
- selected interaction states;
- network request metadata (safe/redacted);
- browser console warnings relevant to reconstruction.

### 6.3 RouteAtlas

Discovers and normalizes routes.

Responsibilities:

- same-domain navigation discovery;
- canonical URL normalization;
- redirect map;
- static/dynamic route classification;
- route depth and crawl budgeting;
- exclusion patterns;
- user-selectable route scope.

Default safeguards:

- same-domain only;
- configurable maximum pages;
- configurable maximum crawl depth;
- no authentication bypass;
- no password/private route automation by default.

### 6.4 SourceScanner

Scans local/supplied project files and browser-delivered text assets.

Supported patterns include:

`*.js`, `*.mjs`, `*.cjs`, `*.ts`, `*.tsx`, `*.jsx`, `*.css`, `*.scss`, `*.json`, `*.xml`, `*.html`, `*.vb`, `*.vbs`, `*.cs`, `*.cpp`, `*.cc`, `*.cxx`, `*.h`, `*.hpp`, `*.py`, `*.php`, `*.java`, `*.kt`, `*.swift`, `*.sql`, `*.yaml`, `*.yml`, `*.toml`.

Responsibilities:

- file inventory;
- language/framework hints;
- AST-based structure where parsers are available;
- dependency and import graph;
- endpoint references;
- source map references;
- minified/obfuscated/encrypted classification.

Permitted normalization includes formatting, beautification, safe Base64/URL decoding, bundle/module tracing, and source-map discovery. It does not include breaking encryption.

### 6.5 SiteDNA

Canonical normalized representation of a target.

Initial schema:

```json
{
  "version": "2.0",
  "meta": {},
  "routes": [],
  "navigation": {},
  "dom": {},
  "tokens": {},
  "typography": {},
  "layouts": {},
  "components": {},
  "assets": {},
  "interactions": {},
  "animations": {},
  "forms": {},
  "responsive": {},
  "accessibility": {},
  "technologyHints": {},
  "fingerprints": {}
}
```

SiteDNA is the stable handoff between capture/analysis and reconstruction.

### 6.6 Code360

Code360 builds a graph spanning source, runtime, DOM, routes, components, assets, APIs, and generated output.

Core node types:

- `file`
- `module`
- `function`
- `class`
- `component`
- `dom-node`
- `style-rule`
- `asset`
- `route`
- `interaction`
- `api-endpoint`
- `storage`
- `generated-artifact`

Core edge types:

- `imports`
- `exports`
- `renders`
- `styles`
- `uses-asset`
- `navigates-to`
- `calls`
- `reads`
- `writes`
- `generates`
- `validated-by`

The graph must support reverse lookup from visual mismatch to generated source location.

### 6.7 LayerStack

Normalized processing pipeline:

- L0 Intake
- L1 Capture
- L2 Discovery
- L3 Normalize
- L4 Intelligence
- L5 Reconstruction
- L6 Render
- L7 Validate
- L8 Repair

Every layer writes a checkpointable artifact and can resume independently when its inputs have not changed.

### 6.8 AssetVault

Responsibilities:

- image/SVG/video/font discovery;
- content hashing;
- duplicate detection;
- usage map;
- dimensions/aspect ratio;
- responsive variants;
- unused-asset hints;
- safe local copies only when permitted.

### 6.9 MotionMap / RuntimeMap

Captures observable states:

- default;
- hover;
- focus;
- active;
- expanded/collapsed;
- scrolled/sticky;
- modal/dropdown/menu open;
- mobile menu state;
- light/dark state where accessible;
- loading/empty/error states when safely observable.

Animation sampling may record initial, 25%, 50%, 75%, and final state where practical.

### 6.10 DataMap

Maps client-visible data flow and project-source references.

Secrets are never persisted in clear text. Recognized secret-like values must be replaced with redacted fingerprints.

### 6.11 HostMap

Public metadata only:

- public DNS records;
- CDN/hosting hints;
- TLS metadata;
- server headers;
- external service categories.

If only a CDN edge is known, report `origin: unverified` rather than attempting to uncover it.

### 6.12 SecurityGraph

Defensive security findings and relationships.

Rules include:

- dangerous DOM sinks;
- wildcard `postMessage` patterns;
- suspicious `eval`/`Function` use;
- exposed client secrets;
- insecure cookie flags when publicly observable;
- missing security headers;
- dependency risk metadata;
- third-party script inventory.

Default behavior redacts API keys, passwords, auth tokens, session identifiers, and payment data.

### 6.13 RebuildCore

Reconstruction engine.

Default target: Next.js + React + Tailwind.

Responsibilities:

- shared component inference;
- route/page generation;
- design token implementation;
- interaction recreation;
- asset linking;
- responsive behavior;
- compile-safe output;
- confidence metadata per reconstructed node.

### 6.14 ViewMatrix

Default validation viewports:

- Desktop: 1440x900
- Laptop: 1280x800
- Tablet: 768x1024
- Phone: 390x844
- Small phone: 360x800

Profiles are configurable.

### 6.15 FidelityLab

Must not rely on pixel similarity alone.

Score dimensions:

- Visual
- Structure
- Responsive
- Behavior
- Assets

Example:

```json
{
  "visual": 0.962,
  "structure": 0.991,
  "responsive": 0.944,
  "behavior": 0.910,
  "assets": 1.0,
  "overall": 0.961
}
```

Overall score weighting is configurable and must retain raw sub-scores.

### 6.16 RepairLoop

Repairs the smallest affected scope possible:

1. identify mismatch;
2. locate Code360 node;
3. resolve component/source file;
4. generate minimal patch;
5. rerender affected route/viewports;
6. rescore;
7. stop when target fidelity or repair budget is reached.

It must not continuously regenerate the whole project for a local mismatch.

### 6.17 FormatBridge

Input adapters:

- URL
- HTML
- ZIP/project
- PNG/JPEG/WebP
- selected PDF/image mockups
- DOM snapshots
- supported source projects

Output adapters:

- HTML/CSS
- HTML/Tailwind
- React
- React/Tailwind
- Next.js/Tailwind
- optional Vue
- static bundle
- ZIP
- Git branch/repo export where explicitly authorized
- SiteDNA JSON
- Code360 JSON

## 7. Operating modes

### FastPath

Purpose: speed.

Typical coverage:

- D1;
- basic D2;
- selected D5;
- primary route only or small route set;
- no exhaustive interaction capture.

### Balanced

Default interactive mode.

Covers D1–D6 with moderate crawl and interaction budgets.

### DeepScan

High-fidelity mode.

Adds:

- multi-route analysis;
- computed style detail;
- more interaction states;
- component fingerprinting;
- deeper runtime and dependency maps;
- full visual validation loop.

### MAX

Explicitly requested exhaustive mode subject to hard resource ceilings.

Adds maximum permitted:

- Code360 depth;
- route graph depth;
- component graph analysis;
- runtime state capture;
- security mapping;
- visual comparison;
- RepairLoop passes.

## 8. Performance architecture

### 8.1 Parallelism

Use bounded worker pools rather than unbounded concurrency.

Candidate pools:

- route capture workers;
- asset hashing workers;
- source parsing workers;
- viewport rendering workers;
- validation workers.

Concurrency must be configurable by environment and hardware.

### 8.2 Hashing and fingerprints

Use SHA-256 for stable content identity.

Fingerprint candidates:

- raw asset hash;
- normalized DOM subtree hash;
- computed-style signature;
- component geometry signature;
- source file hash;
- route response signature.

Shared content is analyzed once and referenced from multiple nodes.

### 8.3 Incremental rescans

On subsequent scans:

1. compare source/route fingerprints;
2. invalidate only changed nodes and dependents;
3. reuse valid SiteDNA/Code360 artifacts;
4. rerender only affected routes/viewports.

### 8.4 Cache hierarchy

Preferred hierarchy:

1. in-memory session cache;
2. project-local persistent cache;
3. optional browser IndexedDB for Studio client metadata;
4. rescan when invalid or unavailable.

No secrets are cached.

## 9. Checkpoints and resume

Each LayerStack phase writes a checkpoint manifest.

Example:

```json
{
  "projectId": "...",
  "phase": "L4-intelligence",
  "inputHash": "...",
  "completedUnits": [],
  "pendingUnits": [],
  "errors": [],
  "createdAt": "..."
}
```

Resume semantics:

- unchanged completed work is reused;
- failed units can be retried independently;
- user can Pause / Resume / Cancel;
- cancelled work leaves safe checkpoints unless user deletes them.

## 10. Portable project format

Project container:

```text
project.mirror/
  manifest.json
  site-dna.json
  code360.json
  visual-map.json
  runtime-map.json
  data-map.json
  infra-map.json
  security-map.json
  routes.json
  assets/
  screenshots/
  captures/
  source-map/
  output/
  history/
  checkpoints/
```

The format must be versioned and migration-capable.

## 11. AI provider architecture

`providers/` exposes a single capability interface independent of vendor.

Provider classes may include:

- local model adapter;
- OpenAI-compatible local endpoint;
- OpenAI;
- Anthropic;
- Gemini;
- other future providers.

Routing policy:

- local-first where configured;
- cloud use remains optional;
- fallback is explicit and logged;
- no secret values are sent in prompts;
- only minimum necessary context is shared.

## 12. AI tasks

AI must be used for reasoning-heavy operations, not for deterministic work better handled by parsers.

Appropriate AI tasks:

- component boundary inference;
- semantic naming;
- interaction interpretation;
- reconstruction planning;
- code generation;
- mismatch explanation;
- minimal repair proposal.

Deterministic tasks:

- hashing;
- asset indexing;
- route normalization;
- AST extraction;
- CSS/computed style collection;
- screenshot creation;
- file enumeration;
- basic dependency graph creation.

## 13. Framework / stack detection

Detect hints for:

- React / Next.js;
- Vue / Nuxt;
- Svelte / SvelteKit;
- Angular;
- Astro;
- WordPress;
- Shopify;
- Webflow;
- Wix/Squarespace where observable;
- Bootstrap / Tailwind / Material UI / shadcn/ui / Ant Design;
- Webpack / Vite / Rollup / Turbopack / Parcel / esbuild.

Detection confidence must be reported rather than assumed.

## 14. AI/marketing/dependency maps

### AIMatrix

Detect provider/SDK references from public/supplied source:

- SDK imports;
- public endpoint names;
- environment variable names (values redacted);
- client/server use hints.

### MarketingMap

Detect common analytics/marketing SDK references:

- Google Analytics / GTM;
- Meta Pixel;
- TikTok Pixel;
- Microsoft Clarity;
- Hotjar;
- Segment;
- Mixpanel;
- Amplitude;
- HubSpot;
- UTM handling.

### DependencyMap

Parse package manifests/lockfiles where supplied:

- package.json;
- package-lock.json;
- pnpm-lock.yaml;
- yarn.lock.

Report:

- dependency tree;
- duplicate versions;
- deprecated package hints;
- known-risk metadata when a trusted vulnerability source is available;
- build/postinstall scripts;
- framework/AI/analytics libraries.

## 15. Commands

Primary commands:

```text
/mirror
/map7d
/deepscan
/deepscan360
/code360
/codemap
/routes
/urls
/assets
/runtime
/datamap
/hostmap
/security
/aistack
/marketing
/layers
/reconstruct
/compare
/repair
/export
```

Depth flags:

```text
--fast
--balanced
--deep
--max
```

Example:

```text
/mirror https://example.com --deep
/map7d
/code360
/compare
/repair
/export nextjs
```

## 16. Studio UX

`/studio` is the primary GUI.

Suggested layout:

```text
+----------------------------------------------------+
| MirrorCraft                                        |
+----------------------------------------------------+
| Source: [ URL / Image / Project ]       [ Scan ]   |
+----------------------+-----------------------------+
| Routes / Assets      | Live Preview                |
| Components           |                             |
| 7D status            |                             |
+----------------------+-----------------------------+
| Code360 / SiteDNA    | Inspector / Findings        |
+----------------------------------------------------+
| Preview | Diff | Code | Assets | Security | Export |
+----------------------------------------------------+
```

The UI must expose progress by layer and allow pause/resume/cancel.

## 17. Safety controls

Defaults:

- same-domain crawl;
- hard page/depth budgets;
- no login automation;
- no credential capture;
- password fields omitted from capture;
- Authorization/Cookie/Set-Cookie redacted;
- API keys/tokens/passwords redacted;
- payment inputs excluded;
- private network targets rejected by default;
- hidden-origin discovery not attempted;
- user must explicitly authorize Git/export mutations.

Security logs must never print secret values.

## 18. Error model

All pipeline errors use structured codes:

```text
CAPTURE_*
ROUTE_*
SOURCE_*
PARSE_*
ASSET_*
AI_*
REBUILD_*
RENDER_*
VALIDATE_*
SECURITY_*
EXPORT_*
```

Errors include:

- severity;
- retryability;
- affected unit;
- safe human-readable message;
- no secret-bearing raw payloads.

## 19. Testing strategy

### Unit tests

- URL normalization;
- route scope rules;
- SiteDNA schema;
- Code360 graph primitives;
- redaction;
- hashing/fingerprinting;
- scoring;
- cache invalidation.

### Integration tests

- static HTML site;
- React SPA;
- Next.js site;
- multi-page site;
- responsive site;
- image-only source;
- supplied ZIP/project;
- interaction capture;
- resume from checkpoint.

### Security tests

Verify that:

- secrets are redacted;
- auth headers are never persisted;
- private target protections work;
- password/payment fields are excluded;
- logs remain safe.

### Fidelity tests

Known fixtures with expected visual/structure thresholds across ViewMatrix profiles.

### Performance tests

Measure:

- capture time;
- reuse/cache hit rate;
- incremental rescan time;
- memory peak;
- worker concurrency behavior;
- RepairLoop cost per mismatch.

## 20. Implementation phases

### Phase 0 — Naming and compatibility cleanup

- canonical MirrorCraft terminology;
- remove legacy product names from code-facing surfaces;
- preserve legally required LICENSE/NOTICE attribution;
- command aliases migrated to new names.

### Phase 1 — Core data contracts

- ProjectSource;
- SiteDNA schema;
- Code360 graph schema;
- checkpoint schema;
- error model;
- redaction utilities.

### Phase 2 — Capture and route discovery

- PrismCapture;
- RouteAtlas;
- ViewMatrix basic captures;
- AssetVault indexing.

### Phase 3 — SourceScanner and Code360

- file scanning;
- JS/TS AST support first;
- dependency graph;
- route/API references;
- source-to-DOM relationship hooks.

### Phase 4 — Runtime / Data / Host / Security maps

- MotionMap;
- DataMap;
- HostMap;
- SecurityGraph;
- AIMatrix;
- MarketingMap.

### Phase 5 — RebuildCore

- Next.js target first;
- shared component inference;
- reusable design tokens;
- responsive generation.

### Phase 6 — FidelityLab

- screenshot comparison;
- structural comparison;
- responsive scoring;
- mismatch localization.

### Phase 7 — RepairLoop

- Code360 mismatch lookup;
- minimal source patching;
- rerender/rescore loop;
- repair budgets.

### Phase 8 — Studio UI

- project intake;
- 7D dashboard;
- route selection;
- preview/diff/code/security tabs;
- pause/resume/cancel;
- export flows.

### Phase 9 — FormatBridge and provider expansion

- ZIP/project portability;
- Git export;
- additional output formats;
- local/cloud provider routing.

## 21. Acceptance criteria

Engine v2 is considered complete for initial production use when:

1. A permitted public URL can be scanned into valid SiteDNA and Code360 artifacts.
2. Route selection and crawl limits work predictably.
3. Desktop/tablet/mobile screenshots are captured and associated with route/view state.
4. Assets are hashed, deduplicated, and mapped to usage.
5. JS/TS source supplied by the user can be mapped into the Code360 graph.
6. Security-sensitive values are consistently redacted.
7. Next.js output can be generated and built successfully on supported fixtures.
8. FidelityLab returns independent visual/structure/responsive/behavior/asset scores.
9. RepairLoop can patch a localized mismatch without rebuilding the whole project.
10. A stopped scan can resume from checkpoints without repeating completed work.
11. `/studio` exposes 7D status, route scope, preview/diff, findings, and export.
12. No legacy product branding appears in product-facing surfaces except legally required attribution files.

## 22. Design decisions locked by this spec

- Canonical product name: MirrorCraft.
- Canonical intermediate model: SiteDNA.
- Cross-layer relationship graph: Code360.
- Pipeline abstraction: LayerStack.
- Default output: Next.js + React + Tailwind.
- Default GUI: `/studio`.
- Default safety posture: same-domain, redacted, no auth bypass, no secret collection.
- Default validation: multi-dimensional fidelity, not pixel-only.
- Repair behavior: minimal patch first.
- Execution model: bounded worker pools + checkpoints + incremental caching.
- AI policy: parser/deterministic first; AI only where semantic reasoning materially helps.

## 23. Open implementation choices for the implementation plan

The implementation plan should resolve, with tests, the following details:

- exact SiteDNA/Code360 TypeScript schema library (e.g. Zod vs native types + JSON Schema);
- graph storage representation for v1 (in-memory maps vs embedded store);
- image diff library selection;
- AST parser set and language rollout order;
- worker implementation (worker_threads vs process pool where applicable);
- persistent cache backend;
- Studio state management;
- provider adapter contract;
- route capture queue semantics;
- fidelity score weighting defaults.

These are implementation choices, not reasons to alter the approved architecture.

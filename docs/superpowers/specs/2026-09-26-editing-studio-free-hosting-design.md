# MirrorCraft Editing Studio + Free Hosting Design

Date: 2026-09-26
Status: Design approved in chat; implementation plan pending user review of this spec.

## Purpose

Add a structured Editing Studio to MirrorCraft so reconstructed sites can be safely edited, previewed, compiled, verified, and published. Extend deployment intelligence so MirrorCraft can prefer zero-cost hosting/runtime options when compatible.

## Core principles

1. Structured edits first; raw-code editing remains an advanced escape hatch.
2. Every meaningful edit is traceable, reversible, and verifiable.
3. SiteDNA remains the canonical visual/semantic model; Code360 remains the dependency/source graph.
4. No auth, subscription, CAPTCHA, or paywall bypass. Access-related editing is limited to user-owned/authorized implementations and presentation/state configuration.
5. Static and server-runtime deployments are classified from source/runtime evidence rather than user guesswork.
6. Free-tier hosting is preferred only when requirements fit its technical and quota constraints.

## Editing architecture

```text
Selected visual element / component / page
              ↓
          EditInspector
              ↓
       Parameter Registry
              ↓
        Mutation Planner
         ↙          ↘
   Visual Patch     Code Patch
         ↘          ↙
           CodeAlign
              ↓
       CodeTransparent
              ↓
         Live Compile
              ↓
          Preview/Diff
              ↓
       Verify / Undo / Apply
```

## Proposed modules

```text
src/mirrorcraft/
  editing/
    registry/
    operations/
    mutation-engine/
    history/
    selectors/
    validators/
    presets/
  editing-inspector/
    content/
    style/
    layout/
    color/
    gradient/
    button/
    shape/
    route/
    responsive/
    restructure/
    access/
    advanced/
  compile-engine/
  visual-editor/
  hosting-classifier/
```

## Edit operation contract

```ts
interface EditOperation {
  id: string;
  type: EditOperationType;
  target: string;
  property: string;
  before: unknown;
  after: unknown;
  viewport?: string;
  reason?: string;
  sourceEvidence: string[];
  impactedNodes: string[];
  reversible: boolean;
  verification: string[];
}
```

## Parameter registry

### Rename
- project name
- page name
- route name / slug
- component name
- function / symbol name
- variable name
- CSS class
- token name
- asset filename / alias
- menu, button, form-field, anchor, metadata labels

Rename operations must be dependency-aware through Code360.

### Content / words
- headings, subheadings, paragraphs, labels, captions
- placeholders, tooltips, button/menu/footer text
- validation, alert, badge, price, table and feature text
- SEO, OpenGraph, ARIA and alt text
- modes: single, page-wide, site-wide, find/replace, regex, rewrite, translate, case conversion

### Template / design system
- landing, dashboard, portfolio, product, pricing, blog, docs, admin, commerce, login, profile, gallery, directory, news, custom
- typography scale
- spacing scale
- radius, border, shadow systems
- icon/button/card/navigation/footer families
- visual-density and theme presets

### Style
- typography
- width/height/min/max
- margin/padding/gap
- display/position/z-index/overflow
- flex/grid
- opacity/visibility
- borders/radius/shadows
- object-fit/aspect-ratio
- transforms/transitions/filter/backdrop-filter

### Colors
- text, background, surface, primary, secondary, accent, muted
- border, link, hover, focus, active, disabled
- success, warning, error, info
- HEX/RGB/RGBA/HSL/CSS variables/design tokens
- global token remap

### Gradient
- linear/radial/conic
- angle/position
- stops and stop percentages
- opacity/repeat/blend mode

### URLs / routes
- internal/external links
- API base URL
- image/video/download URLs
- canonical/OpenGraph URLs
- redirects, route slugs, anchors
- mailto/tel/social/CDN references
- route rename must update navigation, sitemap, canonical references and dependent tests.

### Panel
- sidebar/drawer/modal/dialog/sheet/popover/tooltip/accordion/tabs/command palette/notification/settings/inspector panels
- dock, resize, drag, collapse, overlay, backdrop, scroll, sticky, animation

### Button
- content/icon/position/variant/size
- color/border/radius/shadow/padding/gap
- hover/active/focus/disabled/loading states
- href/action/target/full-width/alignment/animation

### Shape
- rectangle, rounded rectangle, circle, ellipse, pill, polygon, triangle, diamond, blob, SVG, clip-path, mask
- size, radius, stroke, fill, rotation, opacity, shadow, transform

### Responsive view
- common presets: 320, 360, 375, 390, 412, 600, 768, 820, 1024, 1280, 1366, 1440, 1536, 1920, 2560
- breakpoint boundary probes: breakpoint-1, breakpoint, breakpoint+1
- per viewport: visibility, position, size, columns, spacing, typography, nav mode, order, overflow

### Restructure
- move, wrap, unwrap, group, ungroup
- split/merge component
- convert section to reusable component
- duplicate/remove/insert/reorder/nest/flatten
- every restructure runs dependency and route validation.

### Access / paywall presentation
Allowed only for user-owned/authorized implementations:
- paywall/subscription component appearance
- subscription panel and plan copy
- preview length and blur-overlay presentation
- login/subscription prompts
- lock icon and CTA
- feature visibility and authorized-route labels

Not supported:
- bypassing subscriptions or authentication
- forged entitlement/login
- stolen/replayed session credentials
- CAPTCHA circumvention

### Assets
- replace/crop/fit/position/resize image
- quality/alt/lazy-load
- SVG/logo/favicon/background/video/poster/font/icon replacement

### Layout
- container/page max width
- columns/rows/sidebar/header/footer dimensions
- section spacing/grid gaps/flex direction/alignment
- sticky/absolute/order rules

### Animation
- entrance/exit/hover/scroll transitions
- delay/duration/easing
- translate/scale/rotate/opacity/stagger/parallax
- reduced-motion fallback

### Forms
- label/type/placeholder/required/default/options/order
- validation/error/success/failure state
- submit text and presentation
- backend actions remain subject to runtime/security boundaries.

### Metadata
- title/description/keywords/canonical/robots
- favicon/manifest/OpenGraph/Twitter/schema.org/language/locale

### Advanced
- CSS/Tailwind/HTML attributes/React props/data attributes/ARIA/component props/JSON/design tokens
- secrets are never exposed as plain-text editable values.

## Editing Studio UI

```text
┌───────────────────────────────────────────────────────────┐
│ MirrorCraft Editing Studio                               │
├────────────┬──────────────────────────────┬───────────────┤
│ Components │          PREVIEW             │ INSPECTOR     │
│ Routes     │                              │ Content       │
│ Assets     │                              │ Style         │
│ History    │                              │ Layout        │
│            │                              │ Colors        │
│            │                              │ Responsive    │
│            │                              │ Behavior      │
│            │                              │ Advanced      │
├────────────┴──────────────────────────────┴───────────────┤
│ Code | Diff | History | Compile | Console | Publish      │
└───────────────────────────────────────────────────────────┘
```

## Compile lifecycle

```text
EDIT
 ↓
incremental validation
 ↓
typecheck
 ↓
lint
 ↓
build
 ↓
browser smoke test
 ↓
visual diff
 ↓
GREEN / RED
```

On failure:

```text
Compile error → GrepEngine → Code360 impact → minimal repair → recompile
```

## Hosting strategy

MirrorCraft should classify hosting into three cost/runtime groups.

### 1. Free static hosting
Best for static-export clones.

Targets:
- GitHub Pages
- Cloudflare Pages
- Netlify Free
- Vercel Hobby static deployments

Default-provider subdomains avoid domain cost:
- `<owner>.github.io/<repo>`
- `<project>.pages.dev`
- `<site>.netlify.app`
- provider-generated Vercel subdomain

### 2. Free serverless/runtime tier
Best for light dynamic workloads.

Targets can include:
- Vercel Hobby for compatible serverless Next.js projects
- Cloudflare Pages Functions / Workers free quota where the runtime is portable
- Netlify Free functions within monthly credits

The classifier must check runtime compatibility before recommending a provider.

### 3. Free backend/data tier
Optional backend adapters:
- Supabase Free: suitable for early-stage auth/database/storage projects within plan quotas
- Neon Free: Postgres-only option for early projects
- Firebase Spark: no-cost Firebase products and quotas, with product-specific limitations

These providers are never silently provisioned; connection is explicit.

## Domain strategy

### Zero-cost default
Prefer provider subdomains because they are reliable and require no registrar purchase.

### Custom domain
If the user owns a domain, support DNS guidance/automation adapters where available. GitHub Pages and Cloudflare Pages both support custom domains.

### Domain purchase
Do not label paid registrar domains as "free". MirrorCraft should show acquisition cost separately from hosting cost.

## Hosting classifier

Inputs:
- static export compatibility
- API routes
- Server Actions
- request-time SSR
- database runtime
- auth runtime
- websocket/server requirement
- writable filesystem
- file count/asset sizes
- build time
- expected traffic tier
- required geographic/runtime features

Output:

```ts
interface HostingRecommendation {
  profile: "static" | "serverless" | "server" | "artifact-only";
  preferredZeroCostTargets: string[];
  compatibleTargets: string[];
  blockedTargets: Array<{ target: string; reasons: string[] }>;
  domainMode: "provider-subdomain" | "custom-domain";
  evidence: string[];
  quotaWarnings: string[];
}
```

## Recommended zero-cost defaults

### Static clone
1. GitHub Pages when source and CI already live in GitHub.
2. Cloudflare Pages when global static delivery, many deploys or Workers integration is useful.
3. Netlify or Vercel when framework/provider tooling is preferable.

### Dynamic Next.js clone
1. Vercel Hobby when project fits Hobby limits and intended use.
2. Netlify Free when functions/credits fit the project.
3. Cloudflare when the app can be adapted to Workers-compatible runtime.

### Database-backed prototype
- Supabase Free for integrated Postgres/Auth/Storage.
- Neon Free when only Postgres is required.

## Publish flow

```text
Clone / Edit
   ↓
Compile + Verify
   ↓
SourceScanner + Runtime Evidence
   ↓
DeploymentClassifier
   ↓
HostingClassifier
   ↓
ReleaseManifest
   ↓
PublishGate
   ↓
Provider Adapter
   ↓
Provider subdomain or owned custom domain
```

## Safety and access boundaries

- Never bypass third-party authentication, paywalls, CAPTCHA, or subscription controls.
- Only clone/reconstruct public or authorized content.
- Do not persist third-party credentials or session tokens in generated source.
- Access-state findings are evidence, not instructions to circumvent controls.

## Verification requirements

Before production publish:
- lint passed
- TypeScript passed
- production build passed
- route validation passed
- no unresolved critical findings
- CodeAlign passed
- CodeTransparent provenance complete
- deployment target compatible
- quota/hosting warnings surfaced
- static target has valid export artifact

## Success criteria

The subsystem is complete when a user can:
1. select an element visually;
2. edit common properties without opening code;
3. rename/restructure with dependency-safe updates;
4. edit responsive variants;
5. undo/redo and inspect mutation history;
6. compile and see precise failures;
7. compare before/after visually;
8. receive a zero-cost hosting recommendation based on evidence;
9. publish to a compatible provider target;
10. use a provider subdomain for a genuinely zero-cost path, or attach an owned custom domain.

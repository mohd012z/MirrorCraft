# MirrorCraft Engine Agent Rules

These instructions apply to `src/mirrorcraft/**`.

## Kernel workflow

For multi-file or architectural tasks, follow this order:

1. **Plan** — state target modules, constraints, acceptance criteria, and verification path.
2. **Inspect** — search/read existing code before editing. Reuse existing contracts when possible.
3. **Map** — identify affected Code360/CodeView nodes, dependencies, routes, viewports, and data flow.
4. **Edit** — make the smallest coherent patch. Avoid unrelated rewrites.
5. **Verify** — run the narrowest relevant checks first, then broader checks when practical.
6. **Explain** — record what changed, why, evidence used, verification performed, and unresolved items.

## CodeStructure

- Keep each engine capability in a focused module under `src/mirrorcraft/`.
- Prefer explicit TypeScript interfaces and discriminated unions.
- Prefer named exports.
- Avoid hidden global state; pass dependencies explicitly.
- Separate observation, inference, mutation, and verification.
- Reuse canonical SiteDNA/Code360 types instead of creating competing representations.

## CodeView

- Every generated or inferred node should be traceable to a source location, route, DOM node, asset, or runtime observation when evidence exists.
- Preserve dependency and dependent edges for reverse lookup.
- Do not invent source mappings when evidence is unavailable; mark them unresolved.

## CodeAlign

- Keep changes aligned with TypeScript strict mode and project conventions.
- Do not persist credentials, tokens, session identifiers, payment data, or other secrets.
- Preserve access-control boundaries: no authentication/paywall/CAPTCHA bypass logic.
- Prefer minimal patches over whole-project regeneration.

## CodeTransparent

- Significant mutations should carry a reason and evidence reference.
- Verification results must be distinguishable from assumptions.
- Record unresolved uncertainty rather than presenting guesses as verified facts.
- Keep changes reversible through git/checkpoint boundaries where practical.

## Verification

When touching executable code, prefer this progression:

1. targeted unit/type checks for the changed module;
2. `npm run typecheck`;
3. `npm run lint`;
4. `npm run build` or `npm run check` for integration-sensitive work.

Do not claim GREEN unless verification actually ran successfully.

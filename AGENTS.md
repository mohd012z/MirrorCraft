<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# MirrorCraft

## What This Is
A reusable template for reverse-engineering any website into a clean, modern Next.js codebase using AI coding agents. The Next.js + shadcn/ui + Tailwind v4 base is pre-scaffolded — run `/clone-website <url1> [<url2> ...]`.

**Cursor-first:** Prefer Cursor’s built-in browser MCP (`cursor-ide-browser`) when available. Also works with Claude Code, Codex, Copilot, Windsurf, and other agents listed in the README.

The default `src/app/page.tsx` is a MirrorCraft showcase landing. Replace it when cloning a target site.

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **UI:** shadcn/ui (Base UI / Radix-style primitives, Tailwind CSS v4, `cn()` utility)
- **Icons:** Lucide React (default — will be replaced/supplemented by extracted SVGs)
- **Styling:** Tailwind CSS v4 with design tokens
- **Runtime:** Node.js 20+
- **Deployment:** Vercel

## Commands
- `npm run setup` — Node check + install
- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint check
- `npm run typecheck` — TypeScript check
- `npm run check` — Run lint + typecheck + build
- `npm run sync:skills` — Regenerate `/clone-website` for all platforms

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utility classes, no inline styles (except when matching extracted computed styles that Tailwind cannot express)
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **Pixel-perfect emulation** — match the target's spacing, colors, typography exactly
- **No personal aesthetic changes during emulation phase** — match 1:1 first, customize later
- **Real content** — use actual text and assets from the target site, not placeholders
- **Beauty-first** — every pixel matters

## Project Structure
```
src/
  app/              # Next.js routes
  components/       # React components
    ui/             # shadcn/ui primitives
    icons.tsx       # Extracted SVG icons as React components
  lib/
    utils.ts        # cn() utility (shadcn)
  types/            # TypeScript interfaces
  hooks/            # Custom React hooks
public/
  images/           # Downloaded images from target site
  videos/           # Downloaded videos from target site
  seo/              # Favicons, OG images, webmanifest
docs/
  research/         # Inspection output (design tokens, components, layout)
  design-references/ # Screenshots and visual references
scripts/            # setup + sync scripts
```

## MOST IMPORTANT NOTES
- When launching parallel builder agents, prefer each teammate in their own worktree/branch; merge at the end and resolve conflicts with full pipeline context.
- After editing `AGENTS.md`, run `bash scripts/sync-agent-rules.sh` (or `npm run sync:agents`) to regenerate platform-specific instruction files.
- After editing `.claude/skills/clone-website/SKILL.md`, run `node scripts/sync-skills.mjs` (or `npm run sync:skills`).
- Credit upstream: see `NOTICE.md` (based on JCodesMore/ai-website-cloner-template).

@docs/research/INSPECTION_GUIDE.md

# MirrorCraft

MirrorCraft is an AI-assisted website reconstruction toolkit for turning permitted web interfaces into clean, editable modern frontend projects.

## What it does

MirrorCraft provides a structured reconstruction pipeline for AI coding agents:

1. **Inspect** a live page across desktop and responsive states.
2. **Capture** screenshots, layout information, assets, typography, colors, and interaction states.
3. **Extract** browser-computed styling and component evidence.
4. **Specify** sections and reusable components before implementation.
5. **Reconstruct** the interface with Next.js, React, Tailwind CSS, and shadcn/ui.
6. **Validate** the result visually and through lint/type/build checks.

## Quick start

Requirements:

- Node.js 20+
- npm
- An AI coding agent with browser automation support

```bash
git clone https://github.com/mohd012z/MirrorCraft.git
cd MirrorCraft
npm run setup
npm run dev
```

Then use the included website reconstruction skill from a supported coding agent.

```text
/clone-website https://example.com
```

## Supported AI coding workflows

The repository contains instructions/configuration for tools such as:

- Cursor
- Claude Code
- Codex
- GitHub Copilot
- Gemini CLI
- Windsurf
- OpenCode
- Cline / Roo
- Aider
- Continue
- Amazon Q
- Augment

See `AGENTS.md` and the agent-specific configuration directories for details.

## Main commands

```bash
npm run setup
npm run dev
npm run build
npm run lint
npm run typecheck
npm run check
npm run sync:skills
npm run sync:agents
npm run smoke:example
```

## Core stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Playwright
- Lucide

## Project layout

```text
src/app/                 Next.js routes
src/components/ui/       UI primitives
docs/research/           Page analysis and component specifications
docs/design-references/  Reference screenshots and visual evidence
.claude/skills/          Core reconstruction skill
.cursor/commands/        Cursor commands
scripts/                  Setup, sync, and smoke-test tooling
AGENTS.md                 Shared AI-agent instructions
```

## Responsible use

Use MirrorCraft only for websites, interfaces, designs, and assets that you own, are licensed to use, or have permission to reproduce.

MirrorCraft is not intended for phishing, impersonation, credential collection, unauthorized access, or copying protected third-party assets without permission. Private APIs, credentials, protected data, and server-side systems are outside the scope of the reconstruction workflow.

## Repository

GitHub: `mohd012z/MirrorCraft`

## Attribution and license

MirrorCraft includes MIT-licensed upstream work. Required copyright and permission notices are preserved in `LICENSE`, with additional attribution information in `NOTICE.md`.

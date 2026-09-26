# Contributing to MirrorCraft

Thanks for helping improve MirrorCraft.

## Ground rules

- **Do not** open PRs that only contain a generated website clone of a third-party site.
- Improvements to the **skill**, **scaffold**, **docs**, or **tooling** are welcome.
- Keep the ethics line: no phishing / impersonation helpers.

## Dev setup

```bash
npm run setup
npm run dev
npm run check
```

## Agent files

| Edit | Then run |
| ---- | -------- |
| `AGENTS.md` | `npm run sync:agents` |
| `.claude/skills/clone-website/SKILL.md` | `npm run sync:skills` |

## CI

GitHub Actions workflow source lives at [`docs/ci-workflow.yml`](./docs/ci-workflow.yml).  
To enable Actions on a fork: copy it to `.github/workflows/ci.yml` (needs `workflow` OAuth scope to push).

## Upstream

This project builds on [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template). Credit them when discussing lineage.

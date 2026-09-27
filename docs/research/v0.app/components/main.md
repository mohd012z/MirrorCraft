# v0.app — Section Spec (extracted 2026-09-27)

Source: https://v0.app/ (public marketing page). Static front-end emulation only:
no backend, no auth, no live prompt generation. Card "screenshots" are CSS
recreations; all copy is verbatim from the source page.

## Navbar
- Left: **New Chat** (black pill button), **Templates ▾**
- Right: Log In (white, 1px #e5e5e5 border, 8px radius), Sign Up (black #171717, white text, 8px radius)
- 1px bottom border, ~64px tall, white background

## Hero (centered)
- Heading: **"What do you want to create?"** — ~48px, weight 600, #171717, line-height 40px+
- Prompt box: white, 1px #e5e5e5 border, 16px radius, ~200px tall, max-width ~1170px
  - Placeholder: "Ask v0 to build…" (gray #737373, 18px)
  - Bottom row: model selector "v0 Max" (left, with chevron) · black square mic button (right, 44px, 8px radius)
- Suggestion chips (pills, full radius, white, 1px border): Contact Form · Image Editor · Mini Game · Finance Calculator · circular refresh button

## Start with a template
- Left heading "Start with a template" (~32px bold), right: category pills — Apps and Games · Landing Pages · Components · Dashboards — + "Browse all ›"
- 3-column card grid, 40px gutters. Each card: screenshot area (16:10, 12px radius, 1px border),
  then title (bold), author avatar + name, views · likes counts.
- Sample cards (real data from the source page):
  - "Image Generation Playground" — estebansuarez — 6.6K views · 737 likes
  - "Brillance SaaS Landing Page" — yadwinder — 14.5K · 2.1K
  - "3D Gallery Photography Template" — joelbqz — 3.5K · 882
  - "Optimus - The AI platform to build and ship" — kerroudj — 9.3K · 1.5K
  - "Grok Creative Studio" — estebansuarez — 1.1K · 115
  - "Pointer AI landing page" — yadwinder — 20.7K · 1.9K

## Footer CTA (centered)
- Heading: "Start building with v0"
- Copy: "Go from idea to production in seconds with smart, secure infrastructure"
- Button: "Get Started" (black, white text)

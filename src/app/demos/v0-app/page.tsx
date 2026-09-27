import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "v0 by Vercel - Build Full-Stack Web Apps with AI",
  description:
    "Smoke-test clone of v0.app — built from Playwright extraction artifacts.",
};

/**
 * Pixel-faithful clone of https://v0.app/
 * Spec: docs/research/v0.app/components/main.md
 * Tokens: docs/research/v0.app/tokens.json
 * Static front-end emulation only — no backend, auth, or live generation.
 */
export default function V0Clone() {
  const nav = "flex items-center gap-7 text-sm text-[#171717]";
  const card = "rounded-xl border border-[#e5e5e5] bg-white overflow-hidden";

  const cards = [
    { title: "Image Generation Playground", author: "estebansuarez", views: "6.6K", likes: "737", bg: "linear-gradient(135deg,#0a0a0a 0%,#262626 100%)" },
    { title: "Brillance SaaS Landing Page", author: "yadwinder", views: "14.5K", likes: "2.1K", bg: "linear-gradient(135deg,#f5f0e6 0%,#e8e0cf 100%)" },
    { title: "3D Gallery Photography Template", author: "joelbqz", views: "3.5K", likes: "882", bg: "linear-gradient(135deg,#111827 0%,#374151 100%)" },
    { title: "Optimus - The AI platform to build and ship", author: "kerroudj", views: "9.3K", likes: "1.5K", bg: "linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)" },
    { title: "Grok Creative Studio", author: "estebansuarez", views: "1.1K", likes: "115", bg: "linear-gradient(135deg,#000 0%,#525252 100%)" },
    { title: "Pointer AI landing page", author: "yadwinder", views: "20.7K", likes: "1.9K", bg: "linear-gradient(135deg,#fafafa 0%,#d4d4d8 100%)" },
  ];

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#fafafa", fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", color: "#171717" }}
    >
      {/* Navbar */}
      <header className="border-b border-[#e5e5e5] bg-white" style={{ height: 64 }}>
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-6">
          <nav className={nav}>
            <button type="button" className="rounded-lg bg-[#171717] px-4 py-2 text-xs font-semibold text-white">
              New Chat
            </button>
            <span className="cursor-default">Templates ▾</span>
          </nav>
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-semibold text-[#171717]">
              Log In
            </button>
            <button type="button" className="rounded-lg bg-[#171717] px-4 py-2 text-xs font-semibold text-white">
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1200px] px-6 pt-20">
        <h1 className="text-center text-5xl font-semibold tracking-tight" style={{ lineHeight: 1.2 }}>
          What do you want to create?
        </h1>

        {/* Prompt box */}
        <div className="mx-auto mt-8 max-w-[820px] rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-sm" style={{ minHeight: 200 }}>
          <p className="text-lg text-[#737373]">Ask v0 to build…</p>
          <div className="mt-10 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-[#525252]">
              <span aria-hidden>⌖</span> v0 Max <span aria-hidden>▾</span>
            </span>
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#171717] text-white" aria-hidden>
              🎤
            </span>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {["✉ Contact Form", "🖼 Image Editor", "🎮 Mini Game", "📈 Finance Calculator"].map((chip) => (
            <span key={chip} className="rounded-full border border-[#e5e5e5] bg-white px-4 py-2 text-sm text-[#171717]">
              {chip}
            </span>
          ))}
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[#737373]" aria-hidden>
            ⟳
          </span>
        </div>
      </section>

      {/* Start with a template */}
      <section className="mx-auto max-w-[1200px] px-6 pt-24">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-3xl font-bold tracking-tight">Start with a template</h2>
          <div className="flex flex-wrap items-center gap-2">
            {["🎮 Apps and Games", "📄 Landing Pages", "▦ Components", "📈 Dashboards"].map((p) => (
              <span key={p} className="rounded-full border border-[#e5e5e5] bg-white px-4 py-2 text-sm text-[#171717]">
                {p}
              </span>
            ))}
            <span className="px-2 text-sm font-semibold text-[#171717]">Browse all ›</span>
          </div>
        </div>

        <div className="mt-8 grid gap-10 md:grid-cols-3">
          {cards.map((c) => (
            <article key={c.title} className={card}>
              <div className="aspect-[16/10] w-full" style={{ background: c.bg }} />
              <div className="flex items-center gap-2 p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4d4d4] text-[10px] font-bold text-[#171717]">
                  {c.author[0].toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.title}</p>
                  <p className="text-xs text-[#737373]">@{c.author}</p>
                </div>
                <div className="text-right text-xs text-[#737373]">
                  <p>{c.views} views</p>
                  <p>{c.likes} likes</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="mx-auto max-w-[1200px] px-6 py-28 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Start building with v0</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-[#737373]">
          Go from idea to production in seconds with smart, secure infrastructure
        </p>
        <button type="button" className="mt-8 rounded-lg bg-[#171717] px-8 py-3 text-sm font-semibold text-white">
          Get Started
        </button>
      </section>

      <p className="pb-10 text-center text-xs text-[#a3a3a3]">
        MirrorCraft smoke test · static emulation of v0.app ·{" "}
        <Link href="/clones" className="font-semibold text-[#171717] underline">
          ← back to clone gallery
        </Link>
      </p>
    </main>
  );
}

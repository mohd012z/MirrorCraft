"use client";

import { useEffect, useRef, useState } from "react";

const STEPS = [
  {
    n: "01",
    title: "Inspect",
    desc: "Screenshots, tokens, hover/scroll/responsive sweeps.",
    icon: "◉",
    detail: "recon · tokens.json",
  },
  {
    n: "02",
    title: "Specify",
    desc: "Every section gets a written spec with real CSS values.",
    icon: "✎",
    detail: "components/*.md",
  },
  {
    n: "03",
    title: "Build",
    desc: "Parallel agents assemble clean Next.js components.",
    icon: "⚒",
    detail: "worktrees → Next.js",
  },
  {
    n: "04",
    title: "Edit",
    desc: "Open the studio to tweak any part directly.",
    icon: "✦",
    detail: "studio → live preview",
  },
];

/** Fraction of the cycle at which the comet reaches each node. */
const CYCLE_MS = 7200;
const NODE_ARRIVAL = [0, CYCLE_MS / 3, (CYCLE_MS * 2) / 3, CYCLE_MS];

/**
 * Animated pipeline strip for the landing page.
 *
 * A glowing "comet" travels the track on a loop; step nodes ignite in
 * sequence with it; cards reveal with a stagger when the section scrolls
 * into view (IntersectionObserver, so it re-plays on every visit to the
 * fold). Pure CSS animation — no JS animation loop.
 */
export function PipelineSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className={`mc-pipeline ${inView ? "mc-pipeline-live" : ""}`}>
      {/* Track with travelling comet */}
      <div className="mc-pipeline-track" aria-hidden>
        <div className="mc-pipeline-comet" />
      </div>

      <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step.n}
            className="mc-pipeline-card group"
            style={
              {
                "--mc-delay": `${index * 140}ms`,
                "--mc-node-delay": `${NODE_ARRIVAL[index]}ms`,
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-3">
              <span className="mc-step-node" aria-hidden>
                <span className="mc-step-node-core">{step.icon}</span>
              </span>
              <span className="mc-step-index">{step.n}</span>
            </div>
            <h3 className="cf-display mt-4 text-lg font-semibold text-slag">
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-iron">{step.desc}</p>
            <p className="mt-3 font-mono text-[11px] text-ember/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {step.detail}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

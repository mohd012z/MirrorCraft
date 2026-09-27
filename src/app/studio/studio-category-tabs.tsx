"use client";

import { useEffect, useRef, useState } from "react";

import { dispatchStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";

export const STUDIO_CATEGORIES = [
  { id: "page-edit", label: "Page", icon: "¶", hint: "Inline edit + quick bar" },
  { id: "sections-edit", label: "Sections", icon: "▤", hint: "Add · reorder · remove" },
  { id: "html-edit", label: "HTML", icon: "</>", hint: "Direct markup edit" },
  { id: "design-edit", label: "Design", icon: "✦", hint: "Palette · typography" },
  { id: "project-edit", label: "Project", icon: "▣", hint: "I/O · history · publish" },
] as const;

type CategoryId = (typeof STUDIO_CATEGORIES)[number]["id"];

/**
 * Bottom-docked, auto-hiding tab bar for the studio (Classic view).
 *
 * Styling follows the XAU//DESK sample: icon above label, evenly spaced, the
 * active tab carries a faint rounded background plus the accent color.
 * Auto-hide: visible at the top and on hover, hides on scroll-down, reappears
 * on scroll-up. A floating pill restores it while hidden. Includes an extra
 * "IDE" tab that switches the studio to the added template (not a replace).
 */
export function StudioCategoryTabs() {
  const [active, setActive] = useState<CategoryId | "ide">("page-edit");
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // Auto-hide: down → hide, up → show, top → always show.
  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      if (y < 24) {
        setHidden(false);
      } else if (delta > 12) {
        setHidden(true);
      } else if (delta < -12) {
        setHidden(false);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: highlight the category currently in the middle band.
  useEffect(() => {
    const sections = STUDIO_CATEGORIES.map((category) =>
      document.getElementById(category.id),
    ).filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.id as CategoryId;
          setActive((current) => (current === id ? current : id));
        }
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  function go(id: CategoryId) {
    setActive(id);
    setHidden(false);
    if (id === "design-edit") {
      dispatchStudioEvent(STUDIO_EVENTS.expandDesign);
    }
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const tabClass = (isCurrent: boolean) =>
    `group flex flex-1 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition ${
      isCurrent
        ? "bg-teal-400/15 text-teal-200 ring-1 ring-teal-300/40"
        : "text-white/55 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <>
      {/* Reveal pill (only while the bar is hidden) */}
      <button
        type="button"
        onClick={() => setHidden(false)}
        aria-label="Show studio tabs"
        className={`fixed bottom-4 right-4 z-[60] rounded-full border border-teal-300/40 bg-[#0a0e1a]/95 px-3.5 py-2 text-xs font-semibold text-teal-200 shadow-lg backdrop-blur transition-all duration-300 hover:bg-teal-400/15 ${
          hidden ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        ▲ Tabs
      </button>

      <footer
        onMouseEnter={() => setHidden(false)}
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-teal-300/25 bg-[#0a0e1a]/95 backdrop-blur transition-transform duration-300 ${
          hidden ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] items-center gap-1 px-2 py-2 sm:px-4">
          <nav aria-label="Studio categories" className="flex flex-1 items-center gap-1">
            {STUDIO_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => go(category.id)}
                aria-current={active === category.id ? "page" : undefined}
                title={category.hint}
                className={tabClass(active === category.id)}
              >
                <span
                  aria-hidden
                  className={`text-sm leading-none ${
                    active === category.id ? "text-teal-300" : "text-white/35 group-hover:text-white/60"
                  }`}
                >
                  {category.icon}
                </span>
                <span className="text-[11px] font-semibold tracking-wide">{category.label}</span>
              </button>
            ))}

            {/* Added template — switches to the IDE view (does not replace Classic) */}
            <button
              type="button"
              onClick={() => {
                setActive("ide");
                dispatchStudioEvent(STUDIO_EVENTS.view, "template");
              }}
              title="Open the IDE template view"
              className={tabClass(active === "ide")}
            >
              <span
                aria-hidden
                className={`text-sm leading-none ${
                  active === "ide" ? "text-teal-300" : "text-white/35 group-hover:text-white/60"
                }`}
              >
                ▦
              </span>
              <span className="text-[11px] font-semibold tracking-wide">IDE</span>
            </button>
          </nav>

          <div className="hidden items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 sm:flex">
            {(["import", "export", "load"] as const).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => dispatchStudioEvent(STUDIO_EVENTS.io, action)}
                className="h-8 rounded-md px-3 text-xs capitalize text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}

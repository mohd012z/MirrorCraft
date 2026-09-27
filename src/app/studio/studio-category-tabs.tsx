"use client";

import { useEffect, useRef, useState } from "react";

import { dispatchStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";

export const STUDIO_CATEGORIES = [
  { id: "page-edit", label: "Page", hint: "Inline edit + quick bar" },
  { id: "sections-edit", label: "Sections", hint: "Add · reorder · remove" },
  { id: "html-edit", label: "HTML", hint: "Direct markup edit" },
  { id: "design-edit", label: "Design", hint: "Palette · typography" },
  { id: "project-edit", label: "Project", hint: "I/O · history · publish" },
] as const;

type CategoryId = (typeof STUDIO_CATEGORIES)[number]["id"];

/**
 * Bottom-docked, auto-hiding category header for the studio.
 *
 * Behavior: visible at the top of the page and on hover; hides when scrolling
 * down through content, reappears when scrolling up. A small pill floats
 * bottom-right while it's hidden so the tab bar is never lost. Selecting a
 * tab scrolls straight to that category's editor; a scroll-spy keeps the
 * active tab in sync while scrolling.
 */
export function StudioCategoryTabs() {
  const [active, setActive] = useState<CategoryId>("page-edit");
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const hoverRef = useRef<HTMLDivElement>(null);

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

  return (
    <>
      {/* Reveal pill (only while the bar is hidden) */}
      <button
        type="button"
        onClick={() => setHidden(false)}
        aria-label="Show studio categories"
        className={`fixed bottom-4 right-4 z-[60] rounded-full border border-teal-300/40 bg-[#0a0e1a]/95 px-3.5 py-2 text-xs font-semibold text-teal-200 shadow-lg backdrop-blur transition-all duration-300 hover:bg-teal-400/15 ${
          hidden ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        ▲ Categories
      </button>

      <footer
        ref={hoverRef}
        onMouseEnter={() => setHidden(false)}
        className={`fixed inset-x-0 bottom-0 z-50 border-t border-teal-300/25 bg-[#0a0e1a]/95 backdrop-blur transition-transform duration-300 ${
          hidden ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 sm:px-6">
          <nav
            aria-label="Studio categories"
            className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-0.5 sm:order-none sm:w-auto sm:flex-1 sm:justify-center"
          >
            {STUDIO_CATEGORIES.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => go(category.id)}
                aria-current={active === category.id ? "page" : undefined}
                title={category.hint}
                className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-xs font-semibold transition ${
                  active === category.id
                    ? "bg-teal-400/15 text-teal-200 ring-1 ring-teal-300/50"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className={active === category.id ? "text-teal-300" : "text-white/30"}>
                  {active === category.id ? "●" : "○"}
                </span>
                {category.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
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

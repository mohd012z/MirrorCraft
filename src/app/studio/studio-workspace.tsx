"use client";

import { useEffect, useState, type FormEvent, type MouseEvent } from "react";

import { HtmlEditPanel } from "@/app/studio/html-edit-panel";
import { PublishGate } from "@/app/studio/publish-gate";
import { StudioCompositionSurface } from "@/app/studio/studio-composition-surface";
import { StudioHistoryExperience } from "@/app/studio/studio-history-experience";
import { renderInspectionDrawer } from "@/app/studio/studio-inspection-drawers";
import { StudioMobileControls } from "@/app/studio/studio-mobile-controls";
import { StudioOperationsSurface } from "@/app/studio/studio-operations-surface";
import { StudioProjectIOPanel } from "@/app/studio/studio-project-io-panel";
import { StudioRecoveryPanel } from "@/app/studio/studio-recovery-panel";
import { StudioRestrictionSurface } from "@/app/studio/studio-restriction-surface";
import { TemplateStudio } from "@/app/studio/template-studio";
import { dispatchStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";
import {
  STUDIO_RECOVERY_PROJECT_ID,
  useStudioModel,
  type StudioModelInitial,
} from "@/app/studio/use-studio-model";
import { COLOR_PALETTES, SECTION_PRESETS } from "@/mirrorcraft/design-library/advanced";
import { addSection } from "@/mirrorcraft/section-composer";

export interface StudioWorkspaceProps {
  /** Which shell renders the shared page model (default: the compact IDE template). */
  view?: "classic" | "template";
  /** Seed the model from a clone (?clone=<host>) instead of the starter page. */
  initial?: StudioModelInitial;
}

const STUDIO_BRANCHES = new Set(["main", "preview", "rebrand", "experiment"]);

/**
 * The studio workspace. One shared page model (useStudioModel) is rendered by
 * either shell — edits survive switching views. The compact IDE is wrapped by
 * a small interaction adapter so desktop and mobile controls share the same
 * real model actions instead of carrying duplicate/stub behavior.
 */
export function StudioWorkspace({
  view = "template",
  initial,
}: StudioWorkspaceProps = {}) {
  const model = useStudioModel(initial);
  const [studioBranch, setStudioBranch] = useState("main");

  useEffect(() => {
    if (view !== "template") return;

    function annotateShell() {
      const root = document.querySelector<HTMLElement>(".studio-mobile-hardened > div");
      if (!root) return;
      const footer = root.querySelector<HTMLElement>(":scope > footer");
      footer?.setAttribute("data-studio-bottom-bar", "true");

      const header = root.querySelector<HTMLElement>(":scope > header");
      if (header) {
        const publish = [...header.querySelectorAll<HTMLButtonElement>("button")].find(
          (button) => button.textContent?.trim() === "Publish",
        );
        publish?.setAttribute("data-studio-top-publish", "true");
      }

      const drawer = root.querySelector<HTMLElement>(".absolute.inset-0.top-14");
      if (drawer && !drawer.dataset.studioDrawer) {
        const title = drawer.querySelector("span")?.textContent?.toLowerCase() ?? "";
        const ids: Array<[string, string]> = [
          ["ai trust", "ai-trust"],
          ["360", "context360"],
          ["network", "network"],
          ["console", "console"],
          ["history", "history"],
          ["project", "project"],
          ["code", "code"],
          ["diff", "diff"],
          ["map", "map"],
        ];
        const found = ids.find(([marker]) => title.includes(marker));
        if (found) drawer.dataset.studioDrawer = found[1];
      }
    }

    annotateShell();
    const observer = new MutationObserver(annotateShell);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [view]);

  if (view === "template") {
    function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
      const target = event.target as Element;
      const button = target.closest<HTMLButtonElement>("button");
      if (!button) return;
      const text = button.textContent?.trim() ?? "";

      // The original template top bar had a second flag-only Compile/Publish
      // path. Route both entry points to the single evidence-producing Project
      // gate so there is only one source of truth.
      if (button.closest("header") && button.getAttribute("aria-label") === "Compile") {
        event.preventDefault();
        event.stopPropagation();
        dispatchStudioEvent(STUDIO_EVENTS.drawer, "project");
        return;
      }
      if (button.closest("header") && text === "Publish") {
        event.preventDefault();
        event.stopPropagation();
        dispatchStudioEvent(STUDIO_EVENTS.drawer, "project");
        return;
      }

      // Keep the selected visual branch in sync with the real PublishGate.
      const normalizedBranch = text.replace(/^[✓·]\s*/, "").trim();
      if (STUDIO_BRANCHES.has(normalizedBranch)) {
        setStudioBranch(normalizedBranch);
      }

      // Make the legacy "New page" navigator action real rather than a toast.
      if (text === "＋ New page") {
        event.preventDefault();
        event.stopPropagation();
        model.newProject();
        return;
      }

      // The legacy Components list was informational. Clicking a component now
      // adds that preset to the shared page model.
      if (button.closest("aside")) {
        const preset = SECTION_PRESETS.find((item) => item.label === text);
        if (preset) {
          event.preventDefault();
          event.stopPropagation();
          model.changeComposition(
            addSection(model.composition, preset.id),
            `Add ${preset.label}`,
          );
          return;
        }
      }

      // Desktop Inspector palette swatches previously emitted only a toast.
      // The title uniquely identifies the palette; update the actual model.
      const palette = COLOR_PALETTES.find((item) => item.label === button.title);
      if (palette && button.closest("aside")) {
        model.setPaletteId(palette.id);
      }
    }

    function handleChangeCapture(event: FormEvent<HTMLDivElement>) {
      const select = event.target as HTMLSelectElement;
      if (select.tagName !== "SELECT" || !select.closest("aside")) return;
      const firstOption = select.options[0]?.textContent ?? "";
      if (!firstOption.includes("select a layer")) return;
      const raw = select.value;
      const separator = raw.lastIndexOf(":");
      if (separator <= 0 || separator >= raw.length - 1) return;

      // Section instance IDs contain colons; split from the final colon rather
      // than String.split(":"), which previously broke desktop layer selection.
      const instanceId = raw.slice(0, separator);
      const slot = raw.slice(separator + 1);
      event.stopPropagation();
      dispatchStudioEvent(STUDIO_EVENTS.selectSlot, {
        instanceId,
        slot,
        label: `${instanceId} · ${slot}`,
      });
    }

    return (
      <div
        className="studio-mobile-hardened h-full min-w-0"
        onClickCapture={handleClickCapture}
        onChangeCapture={handleChangeCapture}
      >
        <style>{`
          .studio-mobile-hardened > div > header button[aria-label="Compile"] { display: none !important; }
          .studio-mobile-hardened > div > footer {
            flex-wrap: nowrap !important;
            overflow-x: auto !important;
            overflow-y: hidden !important;
            overscroll-behavior-x: contain;
            scrollbar-width: none;
            padding-bottom: max(.375rem, env(safe-area-inset-bottom));
          }
          .studio-mobile-hardened > div > footer::-webkit-scrollbar { display: none; }
          .studio-mobile-hardened > div > footer > button { flex: 0 0 auto; }
          @media (max-width: 1023px) {
            .studio-mobile-hardened > div > header { padding: .5rem; gap: .375rem; }
            .studio-mobile-hardened > div > header > div { gap: .25rem; }
            .studio-mobile-hardened > div > header button,
            .studio-mobile-hardened > div > header a { min-height: 2.25rem; }
            .studio-mobile-hardened > div > header [data-studio-top-publish="true"] { display: none !important; }
            .studio-mobile-hardened > div > footer > span { display: none; }
            .studio-mobile-hardened #mc-canvas > div:first-child { min-height: 250px; height: 34vh; }
          }
          @media (max-width: 639px) {
            .studio-mobile-hardened > div > header { flex-wrap: nowrap; overflow-x: auto; }
            .studio-mobile-hardened > div > header > div { flex-wrap: nowrap; flex: 0 0 auto; }
            .studio-mobile-hardened #mc-canvas > div:last-child { padding-left: .5rem; padding-right: .5rem; }
          }
        `}</style>

        <TemplateStudio
          composition={model.composition}
          content={model.content}
          graph={model.graph}
          history={model.history}
          historyEntries={model.history.entries.length}
          onCompositionChange={model.changeComposition}
          onContentChange={model.changeContent}
          onRestore={model.restoreFrom}
          onNewProject={model.newProject}
          onBack={() => dispatchStudioEvent(STUDIO_EVENTS.view, "classic")}
          renderDrawer={(which) => {
            if (
              which === "ai-trust" ||
              which === "map" ||
              which === "context360" ||
              which === "diff" ||
              which === "network" ||
              which === "console"
            ) {
              return renderInspectionDrawer(which, {
                composition: model.composition,
                content: model.content,
                graph: model.graph,
                history: model.history,
              });
            }
            if (which === "code") {
              return (
                <>
                  <p className="mb-3 text-xs text-white/40">
                    Edit the page markup directly · live sandboxed preview. Sync pushes it back to the sections.
                  </p>
                  <HtmlEditPanel
                    composition={model.composition}
                    content={model.content}
                    paletteId={model.paletteId}
                  />
                </>
              );
            }
            if (which === "history") {
              return <StudioHistoryExperience history={model.history} onHistoryChange={model.setHistory} />;
            }
            return (
              <div className="space-y-4">
                <StudioProjectIOPanel
                  projectId={STUDIO_RECOVERY_PROJECT_ID}
                  history={model.history}
                  onHistoryChange={model.setHistory}
                />
                <StudioRecoveryPanel controller={model.recovery} />
                <StudioOperationsSurface selection={null} />
                <StudioRestrictionSurface envelope={null} />
                <PublishGate
                  composition={model.composition}
                  content={model.content}
                  paletteId={model.paletteId}
                  branch={studioBranch}
                />
              </div>
            );
          }}
        >
          <StudioCompositionSurface model={model} compact />
        </TemplateStudio>

        <StudioMobileControls model={model} />
      </div>
    );
  }

  return <StudioCompositionSurface model={model} />;
}

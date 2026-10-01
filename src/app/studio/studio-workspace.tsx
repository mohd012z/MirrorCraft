"use client";

import { HtmlEditPanel } from "@/app/studio/html-edit-panel";
import { StudioCompositionSurface } from "@/app/studio/studio-composition-surface";
import { PublishGate } from "@/app/studio/publish-gate";
import { StudioHistoryExperience } from "@/app/studio/studio-history-experience";
import { StudioOperationsSurface } from "@/app/studio/studio-operations-surface";
import { StudioProjectIOPanel } from "@/app/studio/studio-project-io-panel";
import { StudioRestrictionSurface } from "@/app/studio/studio-restriction-surface";
import { StudioRecoveryPanel } from "@/app/studio/studio-recovery-panel";
import { TemplateStudio } from "@/app/studio/template-studio";
import {
  STUDIO_RECOVERY_PROJECT_ID,
  useStudioModel,
  type StudioModelInitial,
} from "@/app/studio/use-studio-model";
import { dispatchStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";
import { renderInspectionDrawer } from "@/app/studio/studio-inspection-drawers";

export interface StudioWorkspaceProps {
  /** Which shell renders the shared page model (default: the compact IDE template). */
  view?: "classic" | "template";
  /** Seed the model from a clone (?clone=<host>) instead of the starter page. */
  initial?: StudioModelInitial;
}

/**
 * The studio workspace. One shared page model (useStudioModel) is rendered by
 * either shell — edits survive switching views:
 *   - "template" (default): the compact IDE — one live preview up top, left
 *     navigator, right inspector, and docked drawers (Code / History /
 *     Project) opened from the bottom bar.
 *   - "classic" (List view): the 5 category sections + auto-hiding tab bar,
 *     kept as an alternative (added, not replaced).
 */
export function StudioWorkspace({
  view = "template",
  initial,
}: StudioWorkspaceProps = {}) {
  const model = useStudioModel(initial);

  if (view === "template") {
    return (
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
                branch="main"
              />
            </div>
          );
        }}
      >
        {/* One preview first (compact: Page + collapsible Design only; the rest
            live in the Code / History / Project drawers). */}
        <StudioCompositionSurface model={model} compact />
      </TemplateStudio>
    );
  }

  return <StudioCompositionSurface model={model} />;
}

"use client";

import { StudioCompositionSurface } from "@/app/studio/studio-composition-surface";
import { TemplateStudio } from "@/app/studio/template-studio";
import { useStudioModel } from "@/app/studio/use-studio-model";
import { dispatchStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";

export interface StudioWorkspaceProps {
  /** Which shell renders the shared page model (default: classic). */
  view?: "classic" | "template";
}

/**
 * The studio workspace. One shared page model (useStudioModel) is rendered by
 * either shell:
 *   - "classic" (default): the category sections + auto-hiding bottom tab bar.
 *   - "template": the added IDE shell (top bar · navigator · canvas ·
 *     inspector · status bar) wrapping the same sections.
 * Switching views keeps the model, so edits survive the round trip.
 */
export function StudioWorkspace({ view = "classic" }: StudioWorkspaceProps = {}) {
  const model = useStudioModel();

  if (view === "template") {
    return (
      <TemplateStudio
        composition={model.composition}
        content={model.content}
        graph={model.graph}
        historyEntries={model.history.entries.length}
        onCompositionChange={model.changeComposition}
        onContentChange={model.changeContent}
        onRestore={model.restoreFrom}
        onNewProject={model.newProject}
        onBack={() => dispatchStudioEvent(STUDIO_EVENTS.view, "classic")}
      >
        <StudioCompositionSurface model={model} />
      </TemplateStudio>
    );
  }

  return <StudioCompositionSurface model={model} />;
}

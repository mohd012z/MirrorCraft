"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import {
  createStudioHistoryFromProjectBundle,
  createStudioProjectBundle,
  parseStudioProjectBundle,
  serializeStudioProjectBundle,
} from "@/mirrorcraft/studio-project-io";
import type { StudioHistory } from "@/mirrorcraft/studio-history";

export interface StudioProjectIOPanelProps {
  projectId: string;
  history: StudioHistory;
  onHistoryChange: Dispatch<SetStateAction<StudioHistory>>;
}

type ProjectFileAction = "import" | "load";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown project I/O error";
}

function safeFilename(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "mirrorcraft-project";
}

export function StudioProjectIOPanel({
  projectId,
  history,
  onHistoryChange,
}: StudioProjectIOPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingAction, setPendingAction] = useState<ProjectFileAction>("import");
  const [status, setStatus] = useState("Ready for project import/export");

  function exportProject() {
    try {
      const bundle = createStudioProjectBundle(projectId, history);
      const raw = serializeStudioProjectBundle(bundle);
      const blob = new Blob([raw], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFilename(history.present.composition.pageId)}.mirrorcraft.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setStatus(`Exported project ${history.present.composition.pageId}`);
    } catch (error) {
      setStatus(`Export blocked: ${errorMessage(error)}`);
    }
  }

  function chooseProjectFile(action: ProjectFileAction) {
    setPendingAction(action);
    setStatus(action === "import" ? "Choose a MirrorCraft project to import" : "Choose a MirrorCraft project to load");
    fileInputRef.current?.click();
  }

  async function readProjectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const raw = await file.text();
      const bundle = parseStudioProjectBundle(raw);
      const nextHistory = createStudioHistoryFromProjectBundle(bundle, history.limit);
      onHistoryChange(nextHistory);
      setStatus(
        pendingAction === "load"
          ? `Loaded project ${file.name}`
          : `Imported project ${file.name}`,
      );
    } catch (error) {
      setStatus(`Project ${pendingAction} failed: ${errorMessage(error)}`);
    }
  }

  return (
    <section
      id="project-io"
      className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300/80">
            Project I/O
          </div>
          <p className="mt-1 text-sm text-white/55">
            {projectId} · {history.present.composition.pageId}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => chooseProjectFile("import")}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
          >
            Import Project
          </button>
          <button
            type="button"
            onClick={exportProject}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
          >
            Export Project
          </button>
          <button
            type="button"
            onClick={() => chooseProjectFile("load")}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white"
          >
            Load Project
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.mirrorcraft.json,application/json"
            onChange={readProjectFile}
            data-mirrorcraft-project-file
            className="hidden"
          />
        </div>
      </div>
      <p className="mt-3 text-xs text-white/40" role="status">
        {status}
      </p>
      <p className="mt-1 text-[11px] text-white/30">
        Project bundles contain the current structure/content snapshot only. Provider credentials and integration secrets are not exported.
      </p>
    </section>
  );
}

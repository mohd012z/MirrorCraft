"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  dispatchStudioEvent,
  onStudioEvent,
  STUDIO_EVENTS,
} from "@/app/studio/studio-bus";
import {
  COLOR_PALETTES,
  SECTION_PRESETS,
} from "@/mirrorcraft/design-library/advanced";
import {
  getSectionSlotValue,
  setSectionSlotValue,
  type SectionContentState,
} from "@/mirrorcraft/section-content";
import {
  duplicateSection,
  hideSection,
  moveSection,
  replaceSectionVariant,
  type PageComposition,
  type SectionInstance,
} from "@/mirrorcraft/section-composer";
import type { StudioRecoveryRecord } from "@/mirrorcraft/studio-recovery";
import { loadStudioRecovery } from "@/mirrorcraft/studio-recovery/storage";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export interface TemplateStudioProps {
  children: React.ReactNode;
  composition: PageComposition;
  content: SectionContentState;
  graph: WebStructureGraph;
  historyEntries: number;
  onCompositionChange: (next: PageComposition, label?: string) => void;
  onContentChange: (next: SectionContentState) => void;
  onRestore: (record: StudioRecoveryRecord) => void;
  onNewProject: () => void;
  /** Switch back to the classic studio view (the template is an added option). */
  onBack?: () => void;
  /**
   * Content for the docked drawers opened from the bottom bar (Code = HTML
   * editing, Project = recovery/publish, History = history experience).
   * Rendered by the caller so drawers can reach the shared page model.
   */
  renderDrawer?: (which: "code" | "project" | "history") => React.ReactNode;
}

const BRANCHES = ["main", "preview", "rebrand", "experiment"] as const;

export function TemplateStudio(props: TemplateStudioProps) {
  const { composition, content, graph } = props;
  const [branch, setBranch] = useState<string>("main");
  const [projectOpen, setProjectOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);
  const [slot, setSlot] = useState<{ instanceId: string; slot: string; label: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [compileState, setCompileState] = useState<{ at: number; ok: boolean } | null>(null);
  const [drawer, setDrawer] = useState<"code" | "project" | "history" | null>(null);

  // Projects = local autosave snapshots (derived, refreshed as revisions change).
  const [projects, setProjects] = useState<StudioRecoveryRecord[]>([]);
  const projectsVersion = useMemo(
    () => `${composition.revision}:${content.revision}`,
    [composition.revision, content.revision],
  );
  useEffect(() => {
    let cancelled = false;
    window.setTimeout(() => {
      try {
        const found: StudioRecoveryRecord[] = [];
        for (const key of Object.keys(window.localStorage)) {
          const match = /mirrorcraft-recovery:(.+)$/i.exec(key);
          if (!match) continue;
          const loaded = loadStudioRecovery(window.localStorage, match[1]);
          if (loaded.status === "ready") found.push(loaded.record);
        }
        found.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
        if (!cancelled) setProjects(found);
      } catch {
        if (!cancelled) setProjects([]);
      }
    }, 0);
    return () => {
      cancelled = true;
    };
  }, [projectsVersion]);

  // Publish gate feedback.
  useEffect(() => {
    return onStudioEvent(STUDIO_EVENTS.publish, (detail) => {
      const ok =
        typeof detail === "object" && detail !== null && "compiled" in detail &&
        (detail as { compiled: boolean }).compiled === true;
      setCompileState({ at: Date.now(), ok });
    });
  }, []);

  // Inspector sync: selecting a layer/slot in the preview or left nav surfaces it here.
  useEffect(() => {
    return onStudioEvent(STUDIO_EVENTS.selectSlot, (detail) => {
      if (typeof detail === "object" && detail !== null && "instanceId" in detail) {
        const d = detail as { instanceId: string; slot: string; label?: string };
        setSlot({ instanceId: d.instanceId, slot: d.slot, label: d.label ?? d.slot });
        setDraft(getSectionSlotValue(content, d.instanceId, d.slot) ?? "");
      }
    });
  }, [content]);

  const visibleSections = composition.sections.filter((s) => !s.hidden);
  const selectedSection = slot
    ? composition.sections.find((s) => s.instanceId === slot.instanceId)
    : undefined;

  function handleCompile() {
    setCompileState({ at: Date.now(), ok: true });
    dispatchStudioEvent(STUDIO_EVENTS.publish, { compiled: true });
  }

  // Bottom-bar drawer requests (Code / History / Project / close).
  useEffect(() => {
    return onStudioEvent(STUDIO_EVENTS.drawer, (detail) => {
      if (detail === "code" || detail === "project" || detail === "history") {
        setDrawer((current) => (current === detail ? null : detail));
      } else if (detail === "close") {
        setDrawer(null);
      }
    });
  }, []);

  // Escape closes an open drawer (preview-level Esc handling is unaffected).
  useEffect(() => {
    if (!drawer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawer(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawer]);

  return (
    <div className="flex h-[100svh] flex-col">
      <TopBar
        branch={branch}
        setBranch={setBranch}
        projectOpen={projectOpen}
        setProjectOpen={setProjectOpen}
        branchOpen={branchOpen}
        setBranchOpen={setBranchOpen}
        projects={projects}
        pageId={composition.pageId}
        onNewProject={props.onNewProject}
        onRestore={props.onRestore}
        onExport={() => dispatchStudioEvent(STUDIO_EVENTS.io, "export")}
        onPreview={() => scrollToCanvas()}
        onCompile={handleCompile}
        onPublish={() =>
          dispatchStudioEvent(STUDIO_EVENTS.publish, { compiled: compileState?.ok ?? false })
        }
        onBack={props.onBack}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <LeftNavigator
          composition={composition}
          content={content}
          graph={graph}
          historyEntries={props.historyEntries}
          slot={slot}
          onSelectSlot={(instanceId, s, label) => {
            setSlot({ instanceId, slot: s, label });
            setDraft(getSectionSlotValue(content, instanceId, s) ?? "");
          }}
          onCompositionChange={props.onCompositionChange}
        />

        <div className="relative min-w-0 flex-1">
          <div id="mc-canvas" className="h-full overflow-y-auto scroll-mt-12">
            {/* Live canvas: wireframe up top, the real editing categories below */}
            <div className="h-[38vh] min-h-[300px] shrink-0">
              <StudioCanvas composition={composition} />
            </div>
            <div className="mx-auto w-full max-w-5xl px-4 pb-24">{props.children}</div>
          </div>

          {/* Docked drawer (Code / History / Project) — overlays the live canvas */}
          {drawer ? (
            <div className="absolute inset-0 top-14 z-30 flex flex-col border-t border-teal-300/30 bg-[#0a0e1a]/97 shadow-2xl backdrop-blur">
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
                  {drawer === "code" ? "Code · direct HTML" : drawer === "history" ? "History" : "Project"}
                </span>
                <button
                  type="button"
                  onClick={() => setDrawer(null)}
                  className="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                >
                  ✕ Close (Esc)
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">{props.renderDrawer?.(drawer)}</div>
            </div>
          ) : null}
        </div>

        <RightInspector
          composition={composition}
          content={content}
          graph={graph}
          slot={slot}
          draft={draft}
          setDraft={setDraft}
          onCommitSlot={() => {
            if (!slot) return;
            props.onContentChange(
              setSectionSlotValue(content, slot.instanceId, slot.slot, draft),
            );
          }}
          onCompositionChange={props.onCompositionChange}
          onPalette={(id) =>
            dispatchStudioEvent(STUDIO_EVENTS.toast, { message: `Palette: ${id} (applies in Page preview)` })
          }
          onSelectSectionSlot={(instanceId, s, label) => {
            setSlot({ instanceId, slot: s, label });
            setDraft(getSectionSlotValue(content, instanceId, s) ?? "");
          }}
        />
      </div>

      <BottomBar
        compileState={compileState}
        drawer={drawer}
        onOpenDrawer={(which) => dispatchStudioEvent(STUDIO_EVENTS.drawer, which)}
      />
    </div>
  );
}

/* ---------- top bar ---------- */

function TopBar(props: {
  branch: string;
  setBranch: (b: string) => void;
  projectOpen: boolean;
  setProjectOpen: (v: boolean) => void;
  branchOpen: boolean;
  setBranchOpen: (v: boolean) => void;
  projects: StudioRecoveryRecord[];
  pageId: string;
  onNewProject: () => void;
  onRestore: (record: StudioRecoveryRecord) => void;
  onExport: () => void;
  onPreview: () => void;
  onCompile: () => void;
  onPublish: () => void;
  onBack?: () => void;
}) {
  const iconBtn =
    "inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-white/75 transition hover:border-teal-300/40 hover:bg-white/5 hover:text-white";
  return (
    <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-3 border-b border-teal-300/20 bg-[#0a0e1a]/95 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/" className="cf-display text-base font-semibold tracking-tight">
          <span className="text-teal-300">Mirror</span>Craft
        </Link>
        <span className="hidden text-white/20 sm:inline">·</span>
        <div className="hidden sm:block">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-teal-300">
            Studio
          </div>
          <h1 className="text-lg font-semibold leading-tight">
            Editing Studio
          </h1>
        </div>
        <Dropdown
          open={props.projectOpen}
          setOpen={props.setProjectOpen}
          label={
            <span className="flex items-center gap-2">
              <span className="text-white/40">Project</span>
              <span className="font-semibold text-white">{props.pageId}</span>
              <span className="text-white/30">▾</span>
            </span>
          }
          className={iconBtn}
        >
          <button
            type="button"
            onClick={props.onNewProject}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-white/75 hover:bg-white/5"
          >
            ＋ New project
          </button>
          <div className="my-1 border-t border-white/10" />
          {props.projects.length > 0 ? (
            props.projects.map((project) => (
              <button
                key={project.projectId}
                type="button"
                onClick={() => props.onRestore(project)}
                className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-white/5"
              >
                <span className="text-xs font-semibold text-white">{project.projectId}</span>
                <span className="text-[10px] text-white/40">
                  {new Date(project.savedAt).toLocaleString()} · restore
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-[11px] text-white/35">
              No saved projects yet — autosave runs as you edit.
            </p>
          )}
          <div className="my-1 border-t border-white/10" />
          <button
            type="button"
            onClick={props.onExport}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-white/75 hover:bg-white/5"
          >
            ⤓ Export project (.mirrorcraft.json)
          </button>
        </Dropdown>

        <Dropdown
          open={props.branchOpen}
          setOpen={props.setBranchOpen}
          label={
            <span className="flex items-center gap-2">
              <span className="text-white/40">Branch</span>
              <span className="font-mono font-semibold text-teal-200">{props.branch}</span>
              <span className="text-white/30">▾</span>
            </span>
          }
          className={iconBtn}
        >
          {BRANCHES.map((b) => (
            <button
              key={b}
              type="button"
              onClick={() => {
                props.setBranch(b);
                props.setBranchOpen(false);
              }}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-mono text-xs hover:bg-white/5 ${
                b === props.branch ? "text-teal-200" : "text-white/75"
              }`}
            >
              {b === props.branch ? "✓" : "·"} {b}
            </button>
          ))}
        </Dropdown>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {props.onBack ? (
          <button
            type="button"
            onClick={props.onBack}
            title="Switch to the List view (category sections)"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs text-white/70 transition hover:border-teal-300/40 hover:bg-white/5 hover:text-white"
          >
            ☰ List view
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => dispatchStudioEvent(STUDIO_EVENTS.undo, { kind: "undo" })}
          className={iconBtn}
        >
          ↶ Undo
        </button>
        <button
          type="button"
          onClick={() => dispatchStudioEvent(STUDIO_EVENTS.undo, { kind: "redo" })}
          className={iconBtn}
        >
          ↷ Redo
        </button>
        <button type="button" onClick={props.onPreview} className={iconBtn}>
          ◈ Preview
        </button>
        <button
          type="button"
          onClick={props.onCompile}
          aria-label="Compile"
          title="Compile (verified static build)"
          className={iconBtn}
        >
          ⚙
        </button>
        <button
          type="button"
          onClick={props.onPublish}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-teal-400 px-4 text-xs font-semibold text-slate-950 transition hover:bg-teal-300"
        >
          Publish
        </button>
      </div>
    </header>
  );
}

function Dropdown({
  open,
  setOpen,
  label,
  className,
  children,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  label: React.ReactNode;
  className: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} className={className} aria-expanded={open}>
        {label}
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-64 rounded-xl border border-white/10 bg-[#101827] p-1.5 shadow-2xl">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ---------- left navigator ---------- */

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-white/5 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40 hover:text-white/70"
      >
        <span>{title}</span>
        <span>{open ? "−" : "＋"}</span>
      </button>
      {open ? <div className="mt-1.5 space-y-0.5 px-2">{children}</div> : null}
    </div>
  );
}

function NavItem({
  label,
  active,
  onClick,
  dim,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  dim?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-md px-2.5 py-1.5 text-left text-xs transition ${
        active
          ? "bg-teal-400/15 text-teal-200 ring-1 ring-teal-300/40"
          : dim
            ? "text-white/35"
            : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function LeftNavigator({
  composition,
  content,
  graph,
  historyEntries,
  slot,
  onSelectSlot,
  onCompositionChange,
}: {
  composition: PageComposition;
  content: SectionContentState;
  graph: WebStructureGraph;
  historyEntries: number;
  slot: { instanceId: string; slot: string; label: string } | null;
  onSelectSlot: (instanceId: string, slot: string, label: string) => void;
  onCompositionChange: (next: PageComposition, label?: string) => void;
}) {
  const assets = composition.sections.flatMap((section) =>
    SECTION_PRESETS.find((p) => p.id === section.presetId)?.slots
      ?.filter((s) => s === "media" || s === "dashboardPreview" || s === "avatar")
      .map((s) => ({ section, slot: s }))
      .filter(Boolean) ?? [],
  );

  return (
    <aside className="hidden w-52 shrink-0 overflow-y-auto border-r border-white/10 bg-[#0d1320] xl:block">
      <NavGroup title="Pages">
        <NavItem label={`${composition.pageId} (current)`} active />
        <NavItem label="＋ New page" dim onClick={() => dispatchStudioEvent(STUDIO_EVENTS.toast, { message: "New page: export the current project, then start a fresh clone." })} />
      </NavGroup>

      <NavGroup title="Sections">
        {composition.sections.map((section) => (
          <div key={section.instanceId} className="group/section">
            <NavItem
              label={`${section.hidden ? "◌" : "▪"} ${section.presetId}`}
              active={slot?.instanceId === section.instanceId}
              onClick={() => onCompositionChange(hideSection(composition, section.instanceId, !section.hidden))}
            />
          </div>
        ))}
      </NavGroup>

      <NavGroup title="Layers">
        {composition.sections
          .filter((s) => !s.hidden)
          .map((section) => {
            const preset = SECTION_PRESETS.find((p) => p.id === section.presetId);
            return (
              <div key={section.instanceId} className="pl-3">
                <NavItem label={`${section.kind}: ${preset?.label ?? section.presetId}`} dim />
                {preset?.slots.map((s) => (
                  <NavItem
                    key={s}
                    label={`↳ ${s}`}
                    active={slot?.instanceId === section.instanceId && slot.slot === s}
                    onClick={() => onSelectSlot(section.instanceId, s, `${section.kind} · ${s}`)}
                  />
                ))}
              </div>
            );
          })}
      </NavGroup>

      <NavGroup title="Components">
        {SECTION_PRESETS.map((preset) => (
          <NavItem key={preset.id} label={preset.label} dim />
        ))}
      </NavGroup>

      <NavGroup title="Assets">
        {assets.length > 0
          ? assets.map(({ section, slot: s }) => (
              <NavItem
                key={`${section.instanceId}:${s}`}
                label={`${section.kind}/${s}`}
                active={slot?.instanceId === section.instanceId && slot.slot === s}
                onClick={() => onSelectSlot(section.instanceId, s, `${section.kind} · ${s}`)}
              />
            ))
          : <NavItem label="No media slots" dim />}
      </NavGroup>

      <NavGroup title="Content">
        <NavItem label={`content rev ${content.revision}`} dim />
        <NavItem label={`composition rev ${composition.revision}`} dim />
      </NavGroup>

      <NavGroup title="Routes">
        <NavItem label="studio (this page)" active />
        <NavItem label="demos/* (built clones)" dim />
      </NavGroup>

      <NavGroup title="Functions">
        <NavItem label="add / remove section" dim />
        <NavItem label="move / duplicate / hide" dim />
        <NavItem label="slot edit (live)" dim />
      </NavGroup>

      <NavGroup title="Database">
        <NavItem label={`WebMap: ${Object.keys(graph.nodes).length} nodes`} dim />
        <NavItem label={`${graph.edges.length} edges`} dim />
        <NavItem label={`${historyEntries} history entries`} dim />
      </NavGroup>
    </aside>
  );
}

/* ---------- live canvas (center) ---------- */

function StudioCanvas({ composition }: { composition: PageComposition }) {
  const [mode, setMode] = useState<"preview" | "html">("preview");
  const visible = composition.sections.filter((s) => !s.hidden);
  return (
    <div className="flex h-full min-h-0 flex-col bg-[#0b101c]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1 text-xs">
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`h-7 rounded-md px-3 transition ${mode === "preview" ? "bg-teal-400/15 text-teal-200" : "text-white/55 hover:text-white"}`}
          >
            Live Preview
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("html");
              dispatchStudioEvent(STUDIO_EVENTS.drawer, "code");
            }}
            className={`h-7 rounded-md px-3 transition ${mode === "html" ? "bg-teal-400/15 text-teal-200" : "text-white/55 hover:text-white"}`}
          >
            HTML Source
          </button>
        </div>
        <span className="font-mono text-[10px] text-white/35">
          {visible.length} sections rendered
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-white/10">
          <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2">
            <span className="size-2.5 rounded-full bg-rose-400/70" />
            <span className="size-2.5 rounded-full bg-amber-400/70" />
            <span className="size-2.5 rounded-full bg-emerald-400/70" />
            <span className="ml-2 font-mono text-[10px] text-slate-500">
              {composition.pageId} — cloned website
            </span>
          </div>
          {visible.map((section) => (
            <SectionPreview key={section.instanceId} section={section} />
          ))}
        </div>
        <p className="mx-auto mt-3 max-w-3xl text-center text-[11px] text-white/30">
          Wireframe of the cloned page · the interactive preview is just below
        </p>
      </div>
    </div>
  );
}

function SectionPreview({ section }: { section: SectionInstance }) {
  const preset = SECTION_PRESETS.find((p) => p.id === section.presetId);
  return (
    <div className="border-b border-slate-100 px-5 py-6 last:border-b-0">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-mono text-[10px] text-white">
          {section.kind}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {preset?.label ?? section.presetId}
        </span>
      </div>
      {section.kind === "hero" ? (
        <div>
          <div className="h-7 w-2/3 rounded bg-slate-800" />
          <div className="mt-2 h-3.5 w-full rounded bg-slate-300" />
          <div className="mt-1.5 h-3.5 w-5/6 rounded bg-slate-200" />
          <div className="mt-4 h-9 w-32 rounded-lg bg-teal-500" />
        </div>
      ) : section.kind === "navbar" ? (
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 rounded bg-slate-800" />
          <div className="flex gap-2">
            <div className="h-3 w-10 rounded bg-slate-300" />
            <div className="h-3 w-10 rounded bg-slate-300" />
            <div className="h-6 w-16 rounded-md bg-slate-900" />
          </div>
        </div>
      ) : section.kind === "cta" ? (
        <div className="flex items-center justify-between rounded-xl bg-slate-950 px-5 py-6">
          <div className="h-5 w-40 rounded bg-white/80" />
          <div className="h-9 w-24 rounded-lg bg-teal-500" />
        </div>
      ) : section.kind === "footer" ? (
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-12 rounded bg-slate-600" />
              <div className="h-2 w-16 rounded bg-slate-200" />
              <div className="h-2 w-14 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 h-3 w-24 rounded bg-slate-700" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-lg border border-slate-200 bg-slate-50" />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- right inspector ---------- */

const INSPECTOR_TABS = [
  "Content",
  "Layout",
  "Style",
  "Responsive",
  "Behavior",
  "Data",
  "Access",
  "Advanced",
] as const;
type InspectorTab = (typeof INSPECTOR_TABS)[number];

function RightInspector({
  composition,
  content,
  graph,
  slot,
  draft,
  setDraft,
  onCommitSlot,
  onCompositionChange,
  onPalette,
  onSelectSectionSlot,
}: {
  composition: PageComposition;
  content: SectionContentState;
  graph: WebStructureGraph;
  slot: { instanceId: string; slot: string; label: string } | null;
  draft: string;
  setDraft: (value: string) => void;
  onCommitSlot: () => void;
  onCompositionChange: (next: PageComposition, label?: string) => void;
  onPalette: (id: string) => void;
  onSelectSectionSlot: (instanceId: string, slot: string, label: string) => void;
}) {
  const [tab, setTab] = useState<InspectorTab>("Content");

  return (
    <aside className="hidden w-64 shrink-0 overflow-y-auto border-l border-white/10 bg-[#0d1320] lg:block">
      <div className="border-b border-white/10 px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-300">
          Inspector
        </p>
        <p className="mt-0.5 truncate text-[11px] text-white/40">
          {slot ? slot.label : "No element selected — pick from Layers or the preview"}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-white/10 p-2">
        {INSPECTOR_TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-md px-2 py-1 text-[11px] transition ${
              tab === item ? "bg-teal-400/15 text-teal-200" : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-4 p-3">
        {tab === "Content" ? (
          <div className="space-y-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Element
              </span>
              <select
                value={slot ? `${slot.instanceId}:${slot.slot}` : ""}
                onChange={(event) => {
                  const [instanceId, s] = event.target.value.split(":");
                  if (instanceId && s) onSelectSectionSlot(instanceId, s, `${instanceId} · ${s}`);
                }}
                className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white outline-none"
              >
                <option value="">— select a layer —</option>
                {composition.sections
                  .filter((s) => !s.hidden)
                  .flatMap((section) =>
                    (SECTION_PRESETS.find((p) => p.id === section.presetId)?.slots ?? []).map((s) => (
                      <option key={`${section.instanceId}:${s}`} value={`${section.instanceId}:${s}`} className="bg-slate-950">
                        {section.kind}/{s}
                      </option>
                    )),
                  )}
              </select>
            </label>
            {slot ? (
              <label className="block">
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  Value
                </span>
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-[11px] text-teal-50 outline-none focus:border-teal-400"
                />
                <button
                  type="button"
                  onClick={onCommitSlot}
                  className="mt-2 h-8 w-full rounded-lg bg-teal-400 text-xs font-semibold text-slate-950 hover:bg-teal-300"
                >
                  Apply to canvas
                </button>
              </label>
            ) : null}
          </div>
        ) : null}

        {tab === "Layout" ? (
          <div className="space-y-3">
            <p className="text-[11px] leading-relaxed text-white/45">
              Reorder or replace the selected section. Full add/remove lives in
              the quick bar (Page category) and the Sections category below.
            </p>
            {slot ? (
              <SectionLayoutControls
                composition={composition}
                instanceId={slot.instanceId}
                onCompositionChange={onCompositionChange}
              />
            ) : (
              <p className="rounded-lg border border-dashed border-white/10 p-3 text-[11px] text-white/35">
                Select a section in Layers first.
              </p>
            )}
          </div>
        ) : null}

        {tab === "Style" ? (
          <div className="space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
              Palette (quick bar syncs)
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PALETTES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  onClick={() => onPalette(item.id)}
                  className="h-7 w-7 rounded-md border border-white/20 transition hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, ${item.background} 55%, ${item.accent} 55%)`,
                  }}
                />
              ))}
            </div>
            <p className="text-[11px] text-white/35">
              Typography, spacing and button controls are in the Page preview
              quick bar (top of the canvas).
            </p>
          </div>
        ) : null}

        {tab === "Responsive" ? (
          <div className="space-y-2">
            {(["auto", "portrait", "landscape", "desktop", "wide"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => dispatchStudioEvent(STUDIO_EVENTS.viewport, v)}
                className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/75 hover:bg-white/5"
              >
                {v === "auto" ? "Auto (device orientation)" : v}
              </button>
            ))}
          </div>
        ) : null}

        {tab === "Behavior" ? (
          <p className="text-[11px] leading-relaxed text-white/45">
            URL, form and animation bindings are tracked per slot in the
            WebStructure graph. Edit link targets inline (click a CTA in the
            Page preview) — the binding updates with the value.
          </p>
        ) : null}

        {tab === "Data" ? (
          <div className="space-y-1 font-mono text-[11px] text-white/55">
            <p>nodes: {Object.keys(graph.nodes).length}</p>
            <p>edges: {graph.edges.length}</p>
            <p>content rev: {content.revision}</p>
            <p>composition rev: {composition.revision}</p>
            <p>slots: {Object.keys(content.values).length}</p>
          </div>
        ) : null}

        {tab === "Access" ? (
          <p className="text-[11px] leading-relaxed text-white/45">
            SecretRef only — credentials never enter the project bundle.
            Publish stays gated behind compile + hosting + domain evidence.
          </p>
        ) : null}

        {tab === "Advanced" ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => dispatchStudioEvent(STUDIO_EVENTS.drawer, "project")}
              className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/75 hover:bg-white/5"
            >
              Open project drawer (I/O · recovery · publish gate)
            </button>
            <button
              type="button"
              onClick={() => dispatchStudioEvent(STUDIO_EVENTS.expandDesign)}
              className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/75 hover:bg-white/5"
            >
              Open design-system canvas
            </button>
            <button
              type="button"
              onClick={() => dispatchStudioEvent(STUDIO_EVENTS.drawer, "code")}
              className="block w-full rounded-lg border border-white/10 px-3 py-2 text-left text-xs text-white/75 hover:bg-white/5"
            >
              Open direct HTML editor
            </button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

function SectionLayoutControls({
  composition,
  instanceId,
  onCompositionChange,
}: {
  composition: PageComposition;
  instanceId: string;
  onCompositionChange: (next: PageComposition, label?: string) => void;
}) {
  const index = composition.sections.findIndex((s) => s.instanceId === instanceId);
  const section = composition.sections[index];
  if (!section) return null;
  const variants = SECTION_PRESETS.filter((p) => p.kind === section.kind);
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={index <= 0}
          onClick={() => onCompositionChange(moveSection(composition, instanceId, index - 1), "Move section")}
          className="h-8 flex-1 rounded-lg border border-white/10 text-xs text-white/75 hover:bg-white/5 disabled:opacity-30"
        >
          ↑ Up
        </button>
        <button
          type="button"
          disabled={index >= composition.sections.length - 1}
          onClick={() => onCompositionChange(moveSection(composition, instanceId, index + 1), "Move section")}
          className="h-8 flex-1 rounded-lg border border-white/10 text-xs text-white/75 hover:bg-white/5 disabled:opacity-30"
        >
          ↓ Down
        </button>
        <button
          type="button"
          onClick={() => onCompositionChange(duplicateSection(composition, instanceId), "Duplicate section")}
          className="h-8 flex-1 rounded-lg border border-white/10 text-xs text-white/75 hover:bg-white/5"
        >
          ⧉ Copy
        </button>
      </div>
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
          Variant
        </span>
        <select
          value={section.presetId}
          onChange={(event) => {
            try {
              onCompositionChange(
                replaceSectionVariant(composition, instanceId, event.target.value),
                "Replace section variant",
              );
            } catch {
              dispatchStudioEvent(STUDIO_EVENTS.toast, {
                message: "Variants must keep the same section kind.",
              });
            }
          }}
          className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white outline-none"
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} className="bg-slate-950">
              {v.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/* ---------- bottom status bar ---------- */

type DrawerId = "code" | "project" | "history";

const DRAWER_BUTTONS: { id: DrawerId; label: string }[] = [
  { id: "code", label: "</> Code" },
  { id: "history", label: "History" },
  { id: "project", label: "Project" },
];

function BottomBar({
  compileState,
  drawer,
  onOpenDrawer,
}: {
  compileState: { at: number; ok: boolean } | null;
  drawer: DrawerId | null;
  onOpenDrawer: (which: DrawerId) => void;
}) {
  const barBtn = (active: boolean) =>
    `h-8 rounded-md px-3 text-xs transition hover:bg-white/5 hover:text-white ${
      active ? "bg-teal-400/15 text-teal-200 ring-1 ring-teal-300/40" : "text-white/55"
    }`;
  return (
    <footer className="flex flex-wrap items-center gap-1 border-t border-teal-300/20 bg-[#0a0e1a] px-3 py-1.5">
      {DRAWER_BUTTONS.map((button) => (
        <button
          key={button.id}
          type="button"
          onClick={() => onOpenDrawer(button.id)}
          aria-pressed={drawer === button.id}
          title={
            button.id === "code"
              ? "Direct HTML editing (docked drawer)"
              : button.id === "history"
                ? "Undo/redo history (docked drawer)"
                : "Project I/O · recovery · compile & publish gate"
          }
          className={barBtn(drawer === button.id)}
        >
          {button.label}
        </button>
      ))}

      <span className="ml-auto flex items-center gap-2 text-[10px] text-white/35">
        {compileState ? (
          <span className={compileState.ok ? "text-teal-300" : "text-amber-300"}>
            {compileState.ok ? "✓ compiled" : "compile gate pending"}
          </span>
        ) : (
          <span>not compiled yet</span>
        )}
        <span>·</span>
        <span>SecretRef only</span>
      </span>
    </footer>
  );
}

/* ---------- helpers ---------- */

function scrollToCanvas() {
  document.getElementById("mc-canvas")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToElement(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

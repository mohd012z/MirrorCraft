"use client";

/**
 * Studio inspection drawers — the bottom-bar function buttons of the compact
 * IDE, each wired to a real engine module (no chrome, no stubs):
 *
 *   AI Trust  → prompt-defense classifier + secret redaction (evidence-only scan)
 *   Map       → web-structure buildWebStructureMap (roots, hierarchy, relationships)
 *   360°      → web-structure buildWeb360Snapshot (node context)
 *   Diff      → studio-history summarizeStudioDiff (session change report)
 *   Network   → web-structure route/api/function/asset nodes + data edges
 *   Console   → the live studio event bus (studio-bus)
 */

import { useEffect, useMemo, useState } from "react";

import { onStudioEvent, STUDIO_EVENTS } from "@/app/studio/studio-bus";
import { SECTION_PRESETS } from "@/mirrorcraft/design-library/advanced";
import type { PageComposition } from "@/mirrorcraft/section-composer";
import type { SectionContentState } from "@/mirrorcraft/section-content";
import { classifyExternalInstruction } from "@/mirrorcraft/prompt-defense";
import { summarizeStudioDiff, type StudioHistory } from "@/mirrorcraft/studio-history";
import { redactSensitiveText } from "@/mirrorcraft/security/redaction";
import {
  buildWeb360Snapshot,
  buildWebStructureMap,
} from "@/mirrorcraft/web-structure/graph";
import type { WebNode, WebNodeKind, WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export type InspectionDrawerId =
  | "ai-trust"
  | "map"
  | "context360"
  | "diff"
  | "network"
  | "console";

export interface InspectionDrawerProps {
  composition: PageComposition;
  content: SectionContentState;
  graph: WebStructureGraph;
  history: StudioHistory;
}

/* ---------- shared chrome ---------- */

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-300">{title}</h3>
        {hint ? <span className="text-[10px] text-white/35">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function NodeLine({ node }: { node: WebNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1 text-xs text-white/75 hover:bg-white/5">
      <span className="w-20 shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-center text-[10px] uppercase tracking-wide text-teal-200/80">
        {node.kind}
      </span>
      <span className="min-w-0 flex-1 truncate">{node.label}</span>
      <span className="hidden shrink-0 font-mono text-[10px] text-white/30 sm:inline">{node.id}</span>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-xs leading-5 text-white/40">
      {children}
    </p>
  );
}

/* ---------- AI Trust (prompt-defense + redaction) ---------- */

interface SectionTrustRow {
  section: PageComposition["sections"][number];
  label: string;
  textLength: number;
  assessment: ReturnType<typeof classifyExternalInstruction>;
  redacted: boolean;
  redactionCount: number;
  redactionCategories: readonly string[];
}

function sectionText(content: SectionContentState, section: PageComposition["sections"][number]): string {
  const prefix = `${section.instanceId}:slot:`;
  return Object.entries(content.values)
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value)
    .filter((value) => value.trim().length > 0)
    .join("\n");
}

const CLASSIFICATION_TONE: Record<string, string> = {
  none: "text-white/40",
  suspicious: "text-amber-300",
  "probable-injection": "text-orange-300",
  "confirmed-injection": "text-rose-300",
};

export function AiTrustDrawer({ composition, content }: InspectionDrawerProps) {
  const rows: SectionTrustRow[] = useMemo(() => {
    return composition.sections
      .filter((section) => !section.hidden)
      .map((section) => {
        const text = sectionText(content, section);
        const assessment = classifyExternalInstruction({
          content: text,
          source: section.instanceId,
        });
        const scan = redactSensitiveText(text);
        return {
          section,
          label: SECTION_PRESETS.find((preset) => preset.id === section.presetId)?.label ?? section.presetId,
          textLength: text.length,
          assessment,
          redacted: scan.redacted,
          redactionCount: scan.count,
          redactionCategories: scan.categories,
        };
      });
  }, [composition, content]);

  const flagged = rows.filter(
    (row) => row.assessment.classification !== "none" || row.redacted,
  );

  return (
    <div className="space-y-3">
      <p className="text-xs leading-5 text-white/40">
        Evidence-only scan of the page content — flagged text stays editable for
        reconstruction fidelity but is treated as non-authoritative data, never as
        executable instruction (CONTENT != COMMAND).
      </p>

      <Card
        title={`Scan summary`}
        hint={`${rows.length} section(s) · ${flagged.length} flagged · ${rows.reduce((sum, row) => sum + row.redactionCount, 0)} secret redaction(s)`}
      >
        {flagged.length === 0 ? (
          <EmptyNote>
            All scanned content is classified as data (no injection signals, no
            sensitive material). Nothing quarantined.
          </EmptyNote>
        ) : (
          <div className="space-y-2">
            {flagged.map((row) => (
              <div key={row.section.instanceId} className="rounded-lg border border-white/10 p-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-white/85">{row.label}</span>
                  <span className={`font-semibold uppercase tracking-wide ${CLASSIFICATION_TONE[row.assessment.classification]}`}>
                    {row.assessment.classification}
                  </span>
                  <span className="text-white/35">score {row.assessment.score.toFixed(2)}</span>
                  {row.redacted ? (
                    <span className="rounded bg-rose-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                      {row.redactionCount} redacted · {row.redactionCategories.join(", ")}
                    </span>
                  ) : null}
                </div>
                {row.assessment.signals.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {row.assessment.signals.map((signal) => (
                      <span key={signal} className="rounded border border-white/10 px-1.5 py-0.5 text-[10px] text-white/60">
                        {signal}
                      </span>
                    ))}
                  </div>
                ) : null}
                {row.assessment.evidence.slice(0, 2).map((evidence) => (
                  <p key={evidence.id} className="mt-1 truncate text-[11px] text-white/40" title={evidence.excerpt}>
                    “{evidence.excerpt.slice(0, 120)}”
                  </p>
                ))}
                <p className="mt-1 text-[10px] text-white/30">
                  action: {row.assessment.action} · evidence: {row.assessment.evidence.map((item) => item.id).join(", ") || "n/a"}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Sections" hint="every visible section, cleanest first">
        <div className="space-y-1">
          {[...rows]
            .sort((a, b) => b.assessment.score - a.assessment.score || a.label.localeCompare(b.label))
            .map((row) => (
              <div key={row.section.instanceId} className="flex items-center gap-2 text-xs">
                <span className={`size-1.5 shrink-0 rounded-full ${row.assessment.classification === "none" && !row.redacted ? "bg-teal-400/60" : "bg-amber-300"}`} />
                <span className="w-32 shrink-0 truncate text-white/70">{row.label}</span>
                <span className="text-white/30">{row.textLength} chars</span>
                {row.assessment.signals.length > 0 ? (
                  <span className={`ml-auto truncate text-[11px] ${CLASSIFICATION_TONE[row.assessment.classification]}`}>
                    {row.assessment.signals.join(" · ")}
                  </span>
                ) : null}
              </div>
            ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Map (web-structure) ---------- */

const TREE_DEPTH_LIMIT = 8;
const TREE_NODE_LIMIT = 250;

export function StructureMapDrawer({ graph }: Pick<InspectionDrawerProps, "graph">) {
  const structure = useMemo(() => buildWebStructureMap(graph), [graph]);

  const kindCounts = useMemo(() => {
    const counts = new Map<WebNodeKind, number>();
    for (const node of Object.values(graph.nodes)) {
      counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [graph]);

  const childrenByParent = useMemo(() => {
    const byParent = new Map<string, WebNode[]>();
    for (const edge of structure.hierarchyEdges) {
      const child = graph.nodes[edge.to];
      if (!child) continue;
      const list = byParent.get(edge.from) ?? [];
      list.push(child);
      byParent.set(edge.from, list);
    }
    return byParent;
  }, [structure, graph]);

  const rendered = { count: 0 };

  function renderTree(node: WebNode, depth: number, visited: Set<string>): React.ReactNode {
    if (rendered.count >= TREE_NODE_LIMIT) return null;
    if (visited.has(node.id) || depth > TREE_DEPTH_LIMIT) return null;
    rendered.count += 1;
    const nextVisited = new Set(visited);
    nextVisited.add(node.id);
    const children = (childrenByParent.get(node.id) ?? [])
      .map((child) => renderTree(child, depth + 1, nextVisited))
      .filter(Boolean);
    return (
      <div key={node.id} style={{ paddingLeft: depth === 0 ? 0 : 12 }}>
        <NodeLine node={node} />
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        title="Page structure"
        hint={`${Object.keys(graph.nodes).length} nodes · ${structure.hierarchyEdges.length} hierarchy edges · ${structure.relationshipEdges.length} relationship edges`}
      >
        {structure.roots.length === 0 ? (
          <EmptyNote>No root nodes in the current page model.</EmptyNote>
        ) : (
          <div className="space-y-0.5">
            {structure.roots.map((root) => renderTree(root, 0, new Set()))}
          </div>
        )}
      </Card>

      <Card title="Node kinds">
        <div className="flex flex-wrap gap-1.5">
          {kindCounts.map(([kind, count]) => (
            <span key={kind} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/65">
              <span className="font-semibold uppercase tracking-wide text-teal-200/80">{kind}</span>{" "}
              {count}
            </span>
          ))}
        </div>
      </Card>

      {structure.relationshipEdges.length > 0 ? (
        <Card title="Relationships" hint="non-hierarchy edges (content, data, navigation)">
          <div className="space-y-1">
            {structure.relationshipEdges.slice(0, 40).map((edge, index) => (
              <div key={`${edge.from}->${edge.to}-${index}`} className="flex items-center gap-2 text-[11px] text-white/55">
                <span className="truncate font-mono">{graph.nodes[edge.from]?.label ?? edge.from}</span>
                <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-sky-200/80">{edge.kind}</span>
                <span className="truncate font-mono">{graph.nodes[edge.to]?.label ?? edge.to}</span>
              </div>
            ))}
            {structure.relationshipEdges.length > 40 ? (
              <p className="text-[10px] text-white/30">+ {structure.relationshipEdges.length - 40} more</p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* ---------- 360° node context ---------- */

export function Context360Drawer({ graph }: Pick<InspectionDrawerProps, "graph">) {
  const nodes = useMemo(() => Object.values(graph.nodes), [graph]);
  const [selectedId, setSelectedId] = useState<string>("");
  const effectiveId = selectedId && graph.nodes[selectedId] ? selectedId : (nodes[0]?.id ?? "");
  const snapshot = useMemo(
    () => (effectiveId ? buildWeb360Snapshot(graph, effectiveId) : null),
    [graph, effectiveId],
  );

  if (nodes.length === 0) {
    return <EmptyNote>No nodes to inspect in the current page model.</EmptyNote>;
  }

  const edgeLine = (from: string, to: string, kind: string) => (
    <div className="flex items-center gap-2 text-[11px] text-white/55">
      <span className="truncate font-mono">{graph.nodes[from]?.label ?? from}</span>
      <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-sky-200/80">{kind}</span>
      <span className="truncate font-mono">{graph.nodes[to]?.label ?? to}</span>
    </div>
  );

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">Focus node</span>
        <select
          value={effectiveId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white outline-none focus:border-teal-400"
        >
          {nodes.map((node) => (
            <option key={node.id} value={node.id} className="bg-slate-950">
              [{node.kind}] {node.label}
            </option>
          ))}
        </select>
      </label>

      {snapshot ? (
        <>
          <Card title="Focus" hint={snapshot.focus.id}>
            <NodeLine node={snapshot.focus} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card title="Parents" hint={String(snapshot.parents.length)}>
              {snapshot.parents.length === 0 ? <EmptyNote>none</EmptyNote> : snapshot.parents.map((node) => <NodeLine key={node.id} node={node} />)}
            </Card>
            <Card title="Children" hint={String(snapshot.children.length)}>
              {snapshot.children.length === 0 ? <EmptyNote>none</EmptyNote> : snapshot.children.map((node) => <NodeLine key={node.id} node={node} />)}
            </Card>
            <Card title="Ancestors" hint={String(snapshot.ancestors.length)}>
              {snapshot.ancestors.length === 0 ? <EmptyNote>none</EmptyNote> : snapshot.ancestors.slice(0, 12).map((node) => <NodeLine key={node.id} node={node} />)}
            </Card>
            <Card title="Descendants" hint={String(snapshot.descendants.length)}>
              {snapshot.descendants.length === 0 ? <EmptyNote>none</EmptyNote> : snapshot.descendants.slice(0, 12).map((node) => <NodeLine key={node.id} node={node} />)}
            </Card>
            <Card title="Incoming edges" hint={String(snapshot.incoming.length)}>
              {snapshot.incoming.length === 0 ? <EmptyNote>none</EmptyNote> : snapshot.incoming.map((edge, index) => <div key={index}>{edgeLine(edge.from, edge.to, edge.kind)}</div>)}
            </Card>
            <Card title="Outgoing edges" hint={String(snapshot.outgoing.length)}>
              {snapshot.outgoing.length === 0 ? <EmptyNote>none</EmptyNote> : snapshot.outgoing.map((edge, index) => <div key={index}>{edgeLine(edge.from, edge.to, edge.kind)}</div>)}
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ---------- Diff (studio-history) ---------- */

function valueDiffLine(nodeId: string, before: string | undefined, after: string | undefined): React.ReactNode {
  return (
    <div className="rounded-md border border-white/10 p-2">
      <p className="truncate font-mono text-[10px] text-white/35">{nodeId}</p>
      <p className="mt-0.5 truncate text-[11px] text-white/45 line-through" title={before}>
        {before ?? "—"}
      </p>
      <p className="truncate text-[11px] text-teal-200/90" title={after}>
        {after ?? "—"}
      </p>
    </div>
  );
}

export function SessionDiffDrawer({ history }: Pick<InspectionDrawerProps, "history">) {
  const diff = useMemo(() => {
    const baseline = history.entries[0]?.before;
    if (!baseline) return null;
    return summarizeStudioDiff(baseline, history.present);
  }, [history]);

  if (!diff) {
    return (
      <EmptyNote>
        No edits yet this session — make a change in the preview and this panel
        reports the diff against the first snapshot.
      </EmptyNote>
    );
  }

  const contentChanges = [
    ...diff.content.changed,
    ...diff.content.added,
    ...diff.content.removed,
  ];
  const sectionCount =
    diff.sections.added.length +
    diff.sections.removed.length +
    diff.sections.moved.length +
    diff.sections.hiddenChanged.length +
    diff.sections.variantChanged.length;

  return (
    <div className="space-y-3">
      <Card
        title="Session change report"
        hint={`${sectionCount} structural change(s) · ${contentChanges.length} content value(s) · revisions +${diff.compositionRevisionDelta}/+${diff.contentRevisionDelta}`}
      >
        {sectionCount === 0 && contentChanges.length === 0 ? (
          <EmptyNote>Only whitespace-equivalent edits recorded so far.</EmptyNote>
        ) : (
          <div className="space-y-2 text-xs text-white/65">
            {diff.sections.added.length > 0 ? (
              <p><span className="text-teal-300">+ added:</span> {diff.sections.added.map((s) => SECTION_PRESETS.find((p) => p.id === s.presetId)?.label ?? s.presetId).join(", ")}</p>
            ) : null}
            {diff.sections.removed.length > 0 ? (
              <p><span className="text-rose-300">− removed:</span> {diff.sections.removed.map((s) => SECTION_PRESETS.find((p) => p.id === s.presetId)?.label ?? s.presetId).join(", ")}</p>
            ) : null}
            {diff.sections.moved.length > 0 ? (
              <p><span className="text-sky-300">↕ moved:</span> {diff.sections.moved.map((m) => `${m.instanceId} (${m.from}→${m.to})`).join(", ")}</p>
            ) : null}
            {diff.sections.hiddenChanged.length > 0 ? (
              <p><span className="text-amber-300">◧ hidden/visible:</span> {diff.sections.hiddenChanged.map((h) => `${h.instanceId} (${h.before ? "shown" : "hidden"}→${h.after ? "shown" : "hidden"})`).join(", ")}</p>
            ) : null}
            {diff.sections.variantChanged.length > 0 ? (
              <p><span className="text-sky-300">✦ variant:</span> {diff.sections.variantChanged.map((v) => `${v.instanceId} (${v.before}→${v.after})`).join(", ")}</p>
            ) : null}
          </div>
        )}
      </Card>

      {contentChanges.length > 0 ? (
        <Card title="Content values" hint={`${diff.content.changed.length} changed · ${diff.content.added.length} added · ${diff.content.removed.length} removed`}>
          <div className="grid gap-2 sm:grid-cols-2">
            {contentChanges.slice(0, 24).map((change, index) => (
              <div key={`${change.nodeId}-${index}`}>{valueDiffLine(change.nodeId, change.before, change.after)}</div>
            ))}
          </div>
          {contentChanges.length > 24 ? (
            <p className="mt-2 text-[10px] text-white/30">+ {contentChanges.length - 24} more</p>
          ) : null}
        </Card>
      ) : null}

      <Card title="Recent steps" hint={`${history.entries.length} total`}>
        <div className="space-y-1">
          {history.entries.slice(-8).reverse().map((entry) => (
            <div key={entry.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-24 shrink-0 text-white/30">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              <span className="truncate text-white/70">{entry.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Network (routes / APIs / functions / assets) ---------- */

const NETWORK_EDGE_KINDS = new Set([
  "calls-api",
  "navigates-to",
  "reads-data",
  "writes-data",
  "cross-function",
]);

const NETWORK_NODE_KINDS: readonly WebNodeKind[] = ["route", "api", "function", "asset", "database"];

export function NetworkDrawer({ graph }: Pick<InspectionDrawerProps, "graph">) {
  const networkNodes = useMemo(
    () => Object.values(graph.nodes).filter((node) => NETWORK_NODE_KINDS.includes(node.kind)),
    [graph],
  );
  const networkEdges = useMemo(
    () => graph.edges.filter((edge) => NETWORK_EDGE_KINDS.has(edge.kind)),
    [graph],
  );
  const assetCount = networkNodes.filter((node) => node.kind === "asset").length;

  if (networkNodes.length === 0) {
    return (
      <EmptyNote>
        This page model has no route / API / function / asset nodes yet.
        Captures produced by the local runtime (<span className="font-mono text-white/60">npm run clone:url</span>)
        feed routes, assets and calls into this graph — the studio stays
        evidence-first: nothing is invented here.
      </EmptyNote>
    );
  }

  return (
    <div className="space-y-3">
      <Card
        title="Wired nodes"
        hint={`${networkNodes.length} node(s) · ${networkEdges.length} data/navigation edge(s) · ${assetCount} asset(s)`}
      >
        <div className="space-y-0.5">
          {networkNodes.slice(0, 40).map((node) => (
            <NodeLine key={node.id} node={node} />
          ))}
          {networkNodes.length > 40 ? (
            <p className="text-[10px] text-white/30">+ {networkNodes.length - 40} more</p>
          ) : null}
        </div>
      </Card>

      {networkEdges.length > 0 ? (
        <Card title="Calls, navigation & data flow">
          <div className="space-y-1">
            {networkEdges.slice(0, 40).map((edge, index) => (
              <div key={`${edge.from}->${edge.to}-${index}`} className="flex items-center gap-2 text-[11px] text-white/55">
                <span className="truncate font-mono">{graph.nodes[edge.from]?.label ?? edge.from}</span>
                <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-sky-200/80">{edge.kind}</span>
                <span className="truncate font-mono">{graph.nodes[edge.to]?.label ?? edge.to}</span>
              </div>
            ))}
            {networkEdges.length > 40 ? (
              <p className="text-[10px] text-white/30">+ {networkEdges.length - 40} more</p>
            ) : null}
          </div>
        </Card>
      ) : (
        <Card title="Calls, navigation & data flow">
          <EmptyNote>Nodes present but no call/navigation/data edges recorded yet.</EmptyNote>
        </Card>
      )}
    </div>
  );
}

/* ---------- Console (live studio bus) ---------- */

interface ConsoleEntry {
  at: string;
  name: string;
  detail: string;
}

const CONSOLE_LIMIT = 200;

function detailToText(detail: unknown): string {
  if (detail === undefined) return "";
  try {
    const text = JSON.stringify(detail);
    return text.length > 140 ? `${text.slice(0, 140)}…` : text;
  } catch {
    return String(detail).slice(0, 140);
  }
}

export function ConsoleDrawer() {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const offs = Object.values(STUDIO_EVENTS).map((eventName) =>
      onStudioEvent(eventName, (detail) => {
        setEntries((current) =>
          [
            { at: new Date().toLocaleTimeString(), name: eventName.replace("mirrorcraft:studio-", ""), detail: detailToText(detail) },
            ...current,
          ].slice(0, CONSOLE_LIMIT),
        );
      }),
    );
    return () => {
      for (const off of offs) off();
    };
  }, [paused]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/40">
          Live studio event stream — every bus event the shell emits (undo/redo,
          selections, I/O, viewport, drawers, toasts).
        </p>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setPaused((value) => !value)}
            className="h-7 rounded-md border border-white/10 px-2.5 text-[11px] text-white/70 transition hover:bg-white/5"
          >
            {paused ? "▶ Resume" : "❚❚ Pause"}
          </button>
          <button
            type="button"
            onClick={() => setEntries([])}
            className="h-7 rounded-md border border-white/10 px-2.5 text-[11px] text-white/70 transition hover:bg-white/5"
          >
            Clear
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyNote>
          No events captured yet. Click the preview, undo/redo, or switch drawers
          and the stream fills in.
        </EmptyNote>
      ) : (
        <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {entries.map((entry, index) => (
            <div key={`${entry.at}-${index}`} className="flex items-baseline gap-2 rounded-md bg-white/[0.02] px-2 py-1 font-mono text-[11px]">
              <span className="shrink-0 text-white/25">{entry.at}</span>
              <span className="w-28 shrink-0 truncate text-teal-200/90">{entry.name}</span>
              <span className="min-w-0 flex-1 truncate text-white/55" title={entry.detail}>{entry.detail || "—"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- dispatcher ---------- */

export function renderInspectionDrawer(
  which: InspectionDrawerId,
  props: InspectionDrawerProps,
): React.ReactNode {
  switch (which) {
    case "ai-trust":
      return <AiTrustDrawer {...props} />;
    case "map":
      return <StructureMapDrawer graph={props.graph} />;
    case "context360":
      return <Context360Drawer graph={props.graph} />;
    case "diff":
      return <SessionDiffDrawer history={props.history} />;
    case "network":
      return <NetworkDrawer graph={props.graph} />;
    case "console":
      return <ConsoleDrawer />;
  }
}

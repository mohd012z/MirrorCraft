import type { WebNode, WebStructureGraph } from "@/mirrorcraft/web-structure/types";
import { buildWeb360Snapshot } from "@/mirrorcraft/web-structure/graph";
import type {
  ImpactReport,
  MirrorCommand,
  MirrorCommandName,
  MirrorTarget,
  MirrorTargetKind,
  TargetContext,
  TargetResolution,
  TargetResolutionCandidate,
} from "@/mirrorcraft/target-studio/types";

export * from "@/mirrorcraft/target-studio/types";

const KIND_MAP: Partial<Record<WebNode["kind"], MirrorTargetKind>> = {
  page: "page",
  route: "route",
  asset: "asset",
  function: "interaction",
  container: "component",
  child: "component",
  content: "dom",
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function metadataStrings(node: WebNode, key: string): string[] {
  const value = node.metadata?.[key];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return [];
}

function metadataNumbers(node: WebNode, key: string): number[] {
  const value = node.metadata?.[key];
  if (typeof value === "number") return [value];
  if (Array.isArray(value)) return value.filter((item): item is number => typeof item === "number");
  return [];
}

export function targetFromWebNode(graph: WebStructureGraph, node: WebNode): MirrorTarget {
  const snapshot = buildWeb360Snapshot(graph, node.id);
  const incoming = snapshot?.incoming.map((edge) => edge.from) ?? [];
  const outgoing = snapshot?.outgoing.map((edge) => edge.to) ?? [];

  return {
    id: node.id,
    kind: KIND_MAP[node.kind] ?? "source",
    webNodeKind: node.kind,
    label: node.label,
    route: node.route,
    file: node.sourcePath,
    sourceRange: node.sourceLine ? { startLine: node.sourceLine, endLine: node.sourceLine } : undefined,
    selector: metadataStrings(node, "selector")[0],
    symbol: metadataStrings(node, "symbol")[0],
    dependencies: unique(outgoing),
    dependents: unique(incoming),
    viewports: unique(metadataNumbers(node, "viewports")),
    findingIds: unique(metadataStrings(node, "findingIds")),
    evidenceIds: unique(metadataStrings(node, "evidenceIds")),
    metadata: node.metadata,
  };
}

export function resolveTarget(
  graph: WebStructureGraph,
  query: { id?: string; route?: string; sourcePath?: string; selector?: string; label?: string },
  confidenceThreshold = 0.8,
): TargetResolution {
  const candidates: TargetResolutionCandidate[] = Object.values(graph.nodes)
    .map((node) => {
      let score = 0;
      const reasons: string[] = [];
      if (query.id && node.id === query.id) { score += 1; reasons.push("exact-id"); }
      if (query.route && node.route === query.route) { score += 0.8; reasons.push("exact-route"); }
      if (query.sourcePath && node.sourcePath === query.sourcePath) { score += 0.8; reasons.push("exact-source"); }
      if (query.label && node.label === query.label) { score += 0.6; reasons.push("exact-label"); }
      if (query.selector && metadataStrings(node, "selector").includes(query.selector)) {
        score += 0.9;
        reasons.push("exact-selector");
      }
      return { target: targetFromWebNode(graph, node), confidence: Math.min(1, score), reasons };
    })
    .filter((candidate) => candidate.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence || a.target.id.localeCompare(b.target.id));

  const top = candidates[0] ?? null;
  const second = candidates[1] ?? null;
  const ambiguous = Boolean(top && second && Math.abs(top.confidence - second.confidence) < 0.1);
  return {
    selected: top && top.confidence >= confidenceThreshold && !ambiguous ? top : null,
    candidates,
    ambiguous,
  };
}

export function buildTargetContext(graph: WebStructureGraph, targetId: string): TargetContext | null {
  const snapshot = buildWeb360Snapshot(graph, targetId);
  if (!snapshot) return null;

  const related = unique([
    ...snapshot.parents,
    ...snapshot.children,
    ...snapshot.ancestors,
    ...snapshot.descendants,
    ...snapshot.incoming.map((edge) => graph.nodes[edge.from]),
    ...snapshot.outgoing.map((edge) => graph.nodes[edge.to]),
  ].filter((node): node is WebNode => Boolean(node)));
  const target = targetFromWebNode(graph, snapshot.focus);
  const all = [snapshot.focus, ...related];

  return {
    target,
    sourceFiles: unique(all.flatMap((node) => node.sourcePath ? [node.sourcePath] : [])),
    styles: unique(all.flatMap((node) => metadataStrings(node, "styles"))),
    assets: unique(all.filter((node) => node.kind === "asset").map((node) => node.id)),
    routes: unique(all.flatMap((node) => node.route ? [node.route] : [])),
    interactions: unique(all.filter((node) => node.kind === "function" || node.kind === "api").map((node) => node.id)),
    affectedTargets: unique(related.map((node) => node.id)),
    affectedViewports: unique(all.flatMap((node) => metadataNumbers(node, "viewports"))).sort((a, b) => a - b),
    evidence: unique(all.flatMap((node) => metadataStrings(node, "evidenceIds"))),
    findings: unique(all.flatMap((node) => metadataStrings(node, "findingIds"))),
    confidence: 1,
    unresolved: [],
  };
}

export function buildImpactReport(graph: WebStructureGraph, targetId: string): ImpactReport | null {
  const context = buildTargetContext(graph, targetId);
  if (!context) return null;
  const affectedNodes = [context.target, ...context.affectedTargets.map((id) => graph.nodes[id]).filter(Boolean).map((node) => targetFromWebNode(graph, node))];
  const affectedTests = unique(affectedNodes.flatMap((target) => {
    const tests = target.metadata?.tests;
    return Array.isArray(tests) ? tests.filter((item): item is string => typeof item === "string") : [];
  }));

  return {
    targetId,
    affectedFiles: context.sourceFiles,
    affectedComponents: unique(affectedNodes.filter((target) => target.kind === "component").map((target) => target.id)),
    affectedRoutes: context.routes,
    affectedInteractions: context.interactions,
    affectedViewports: context.affectedViewports,
    affectedTests,
    affectedFindings: context.findings,
    requiresBuild: context.sourceFiles.length > 0,
    requiresCapture: context.routes.length > 0 && context.affectedViewports.length > 0,
    requiresBehaviorTest: context.interactions.length > 0,
  };
}

export function createMirrorCommand(input: {
  command: MirrorCommandName;
  targetId: string;
  mode?: MirrorCommand["mode"];
  intent?: string;
  preserve?: string[];
  verification?: MirrorCommand["verification"];
}): MirrorCommand {
  const mode = input.mode ?? (input.command === "modify" || input.command === "rectify" ? "virtual" : "read");
  const stable = JSON.stringify({ command: input.command, targetId: input.targetId, mode, intent: input.intent ?? "" });
  let hash = 2166136261;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return {
    id: `mc-${(hash >>> 0).toString(16).padStart(8, "0")}`,
    command: input.command,
    targetId: input.targetId,
    mode,
    intent: input.intent,
    preserve: input.preserve,
    verification: input.verification,
  };
}

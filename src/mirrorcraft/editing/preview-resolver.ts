import type { DirectPreviewSelection } from "@/mirrorcraft/editing/direct-preview";
import type { WebNode, WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export type DirectEditCapability =
  | "text"
  | "url"
  | "image"
  | "icon"
  | "prompt"
  | "style"
  | "view360"
  | "code";

export interface PreviewElementDescriptor {
  nodeId?: string;
  tagName: string;
  text?: string;
  href?: string;
  attributes: Record<string, string | undefined>;
}

function descriptorNodeId(descriptor: PreviewElementDescriptor): string | undefined {
  return descriptor.nodeId ?? descriptor.attributes["data-mirrorcraft-node"];
}

function toSelection(node: WebNode): DirectPreviewSelection {
  return {
    nodeId: node.id,
    kind: node.kind,
    sourcePath: node.sourcePath,
    sourceLine: node.sourceLine,
  };
}

export function resolvePreviewSelection(
  graph: WebStructureGraph,
  descriptor: PreviewElementDescriptor,
): DirectPreviewSelection | null {
  const nodeId = descriptorNodeId(descriptor);
  if (!nodeId) return null;

  const node = graph.nodes[nodeId];
  return node ? toSelection(node) : null;
}

function roleOf(graphNode: WebNode | undefined): string | undefined {
  const role = graphNode?.metadata?.role;
  return typeof role === "string" ? role.toLowerCase() : undefined;
}

export function getDirectEditCapabilities(
  selection: DirectPreviewSelection,
  descriptor: PreviewElementDescriptor,
  graph?: WebStructureGraph,
): DirectEditCapability[] {
  const capabilities = new Set<DirectEditCapability>(["prompt", "style", "view360"]);
  if (selection.sourcePath) capabilities.add("code");

  const tag = descriptor.tagName.toLowerCase();
  const node = graph?.nodes[selection.nodeId];
  const role = roleOf(node);

  if (
    descriptor.text !== undefined ||
    ["a", "button", "h1", "h2", "h3", "h4", "h5", "h6", "p", "span", "label"].includes(tag) ||
    role === "button" ||
    role === "text"
  ) {
    capabilities.add("text");
  }

  if (descriptor.href !== undefined || tag === "a" || role === "link" || role === "button") {
    capabilities.add("url");
  }

  if (tag === "img" || selection.kind === "asset" || role === "image") {
    capabilities.add("image");
  }

  if (tag === "svg" || role === "icon") {
    capabilities.add("icon");
  }

  return [...capabilities];
}

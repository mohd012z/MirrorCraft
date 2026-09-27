import { createDirectPreviewEdit, type DirectPreviewEditRequest } from "@/mirrorcraft/editing/direct-preview";
import type { EditOperation } from "@/mirrorcraft/editing/types";
import {
  getDirectEditCapabilities,
  resolvePreviewSelection,
  type DirectEditCapability,
  type PreviewElementDescriptor,
} from "@/mirrorcraft/editing/preview-resolver";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export type PreviewActionId =
  | "edit-text"
  | "edit-url"
  | "edit-image"
  | "edit-icon"
  | "ask-ai"
  | "edit-style"
  | "view-360"
  | "open-code";

export interface PreviewAction {
  id: PreviewActionId;
  label: string;
  capability: DirectEditCapability;
  mutates: boolean;
}

const ACTIONS: Record<DirectEditCapability, PreviewAction> = {
  text: { id: "edit-text", label: "Text", capability: "text", mutates: true },
  url: { id: "edit-url", label: "URL", capability: "url", mutates: true },
  image: { id: "edit-image", label: "Image", capability: "image", mutates: true },
  icon: { id: "edit-icon", label: "Icon", capability: "icon", mutates: true },
  prompt: { id: "ask-ai", label: "Ask AI", capability: "prompt", mutates: true },
  style: { id: "edit-style", label: "Style", capability: "style", mutates: false },
  view360: { id: "view-360", label: "360", capability: "view360", mutates: false },
  code: { id: "open-code", label: "Code", capability: "code", mutates: false },
};

const MUTATION_TYPES: Partial<Record<PreviewActionId, DirectPreviewEditRequest["type"]>> = {
  "edit-text": "text",
  "edit-url": "url",
  "edit-image": "image",
  "edit-icon": "icon",
  "ask-ai": "prompt",
};

export function buildPreviewActions(
  graph: WebStructureGraph,
  descriptor: PreviewElementDescriptor,
): PreviewAction[] {
  const selection = resolvePreviewSelection(graph, descriptor);
  if (!selection) return [];

  return getDirectEditCapabilities(selection, descriptor, graph).map(
    (capability) => ACTIONS[capability],
  );
}

export function composePreviewEdit(
  graph: WebStructureGraph,
  descriptor: PreviewElementDescriptor,
  actionId: PreviewActionId,
  value: string,
): EditOperation | null {
  const selection = resolvePreviewSelection(graph, descriptor);
  if (!selection) return null;

  const type = MUTATION_TYPES[actionId];
  if (!type) return null;

  return createDirectPreviewEdit(selection, { type, value } as DirectPreviewEditRequest);
}

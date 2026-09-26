import { buildPreviewActions, type PreviewAction } from "@/mirrorcraft/editing/preview-actions";
import {
  resolvePreviewSelection,
  type PreviewElementDescriptor,
} from "@/mirrorcraft/editing/preview-resolver";
import type { DirectPreviewSelection } from "@/mirrorcraft/editing/direct-preview";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasViewport {
  width: number;
  height: number;
}

export interface CanvasElementDescriptor extends PreviewElementDescriptor {
  rect: CanvasRect;
  viewport: CanvasViewport;
}

export interface CanvasSelection extends DirectPreviewSelection {
  rect: CanvasRect;
  actions: PreviewAction[];
  descriptor: CanvasElementDescriptor;
}

export type InlineEditKind = "text" | "url" | "image" | "icon" | "prompt";
export type InlineEditStatus = "editing" | "committed" | "cancelled";

export interface InlineEditSession {
  selection: CanvasSelection;
  kind: InlineEditKind;
  initialValue: string;
  value: string;
  status: InlineEditStatus;
}

export interface ToolbarAnchor {
  x: number;
  y: number;
  placement: "above" | "below";
}

const TOOLBAR_WIDTH = 360;
const TOOLBAR_HEIGHT = 44;
const TOOLBAR_GAP = 8;
const VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function createCanvasSelection(
  graph: WebStructureGraph,
  descriptor: CanvasElementDescriptor,
): CanvasSelection | null {
  const selection = resolvePreviewSelection(graph, descriptor);
  if (!selection) return null;

  return {
    ...selection,
    rect: { ...descriptor.rect },
    actions: buildPreviewActions(graph, descriptor),
    descriptor: {
      ...descriptor,
      attributes: { ...descriptor.attributes },
      rect: { ...descriptor.rect },
      viewport: { ...descriptor.viewport },
    },
  };
}

export function resolveToolbarAnchor(
  rect: CanvasRect,
  viewport: CanvasViewport,
): ToolbarAnchor {
  const centeredX = rect.x + rect.width / 2 - TOOLBAR_WIDTH / 2;
  const maxX = viewport.width - TOOLBAR_WIDTH - VIEWPORT_MARGIN;
  const x = clamp(centeredX, VIEWPORT_MARGIN, maxX);

  const aboveY = rect.y - TOOLBAR_HEIGHT - TOOLBAR_GAP;
  if (aboveY >= VIEWPORT_MARGIN) {
    return { x, y: aboveY, placement: "above" };
  }

  const belowY = rect.y + rect.height + TOOLBAR_GAP;
  const maxY = viewport.height - TOOLBAR_HEIGHT - VIEWPORT_MARGIN;
  return {
    x,
    y: clamp(belowY, VIEWPORT_MARGIN, maxY),
    placement: "below",
  };
}

export function createInlineEditSession(
  selection: CanvasSelection,
  kind: InlineEditKind,
  initialValue: string,
): InlineEditSession {
  return {
    selection,
    kind,
    initialValue,
    value: initialValue,
    status: "editing",
  };
}

export function updateInlineEditSession(
  session: InlineEditSession,
  value: string,
): InlineEditSession {
  if (session.status !== "editing") return session;
  return { ...session, value };
}

export function commitInlineEditSession(session: InlineEditSession): InlineEditSession {
  if (session.status !== "editing") return session;
  return { ...session, status: "committed" };
}

export function cancelInlineEditSession(session: InlineEditSession): InlineEditSession {
  if (session.status !== "editing") return session;
  return { ...session, value: session.initialValue, status: "cancelled" };
}

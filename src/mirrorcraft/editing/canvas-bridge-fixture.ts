import {
  createCanvasSelection,
  createInlineEditSession,
  resolveToolbarAnchor,
  type CanvasElementDescriptor,
} from "@/mirrorcraft/editing/canvas-bridge";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

const graph: WebStructureGraph = {
  nodes: {
    "hero-title": {
      id: "hero-title",
      kind: "content",
      label: "Hero title",
      sourcePath: "src/app/page.tsx",
      sourceLine: 20,
      metadata: { role: "text" },
    },
  },
  edges: [],
};

const element: CanvasElementDescriptor = {
  nodeId: "hero-title",
  tagName: "h1",
  text: "Build faster",
  attributes: { "data-mirrorcraft-node": "hero-title" },
  rect: { x: 120, y: 180, width: 480, height: 72 },
  viewport: { width: 1440, height: 900 },
};

const selection = createCanvasSelection(graph, element);
if (!selection) throw new Error("Expected a canvas selection");

const anchor = resolveToolbarAnchor(selection.rect, element.viewport);
if (anchor.x < 0 || anchor.y < 0) throw new Error("Toolbar anchor must stay inside the viewport");

const session = createInlineEditSession(selection, "text", "Build faster");
if (session.status !== "editing") throw new Error("Inline editor must start in editing state");

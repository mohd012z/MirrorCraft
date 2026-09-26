import {
  buildPreviewActions,
  composePreviewEdit,
} from "@/mirrorcraft/editing/preview-actions";
import type { PreviewElementDescriptor } from "@/mirrorcraft/editing/preview-resolver";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

const graph: WebStructureGraph = {
  projectId: "fixture-project",
  nodes: {
    cta: {
      id: "cta",
      kind: "child",
      label: "CTA",
      sourcePath: "src/app/page.tsx",
      sourceLine: 12,
      metadata: { role: "button" },
    },
  },
  edges: [],
};

const descriptor: PreviewElementDescriptor = {
  nodeId: "cta",
  tagName: "a",
  text: "Start",
  href: "/start",
  attributes: { "data-mirrorcraft-node": "cta" },
};

const actions = buildPreviewActions(graph, descriptor);
if (!actions.some((action) => action.id === "edit-text")) {
  throw new Error("Expected text action for CTA.");
}
if (!actions.some((action) => action.id === "edit-url")) {
  throw new Error("Expected URL action for CTA.");
}
if (!actions.some((action) => action.id === "ask-ai")) {
  throw new Error("Expected AI prompt action for resolved selection.");
}
if (!actions.some((action) => action.id === "view-360")) {
  throw new Error("Expected Web360 action for resolved selection.");
}

const edit = composePreviewEdit(graph, descriptor, "edit-text", "Get Started");
if (!edit || edit.parameterId !== "content.text") {
  throw new Error("Expected edit-text action to compose a content.text operation.");
}

const nonMutation = composePreviewEdit(graph, descriptor, "view-360", "");
if (nonMutation !== null) {
  throw new Error("Navigation actions must not create edit operations.");
}

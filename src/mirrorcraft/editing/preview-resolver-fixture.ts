import {
  getDirectEditCapabilities,
  resolvePreviewSelection,
  type PreviewElementDescriptor,
} from "@/mirrorcraft/editing/preview-resolver";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

const graph: WebStructureGraph = {
  projectId: "fixture-project",
  nodes: {
    "hero-cta": {
      id: "hero-cta",
      kind: "child",
      label: "Hero CTA",
      sourcePath: "src/app/page.tsx",
      sourceLine: 42,
      metadata: { role: "button" },
    },
    "hero-image": {
      id: "hero-image",
      kind: "asset",
      label: "Hero Image",
      sourcePath: "src/app/page.tsx",
      sourceLine: 48,
      metadata: { role: "image" },
    },
  },
  edges: [],
};

const buttonDescriptor: PreviewElementDescriptor = {
  nodeId: "hero-cta",
  tagName: "a",
  text: "Get Started",
  href: "/signup",
  attributes: { "data-mirrorcraft-node": "hero-cta" },
};

const buttonSelection = resolvePreviewSelection(graph, buttonDescriptor);
if (!buttonSelection || buttonSelection.nodeId !== "hero-cta") {
  throw new Error("Expected preview descriptor to resolve to hero-cta.");
}

const buttonCapabilities = getDirectEditCapabilities(buttonSelection, buttonDescriptor);
if (!buttonCapabilities.includes("text") || !buttonCapabilities.includes("url")) {
  throw new Error("Expected button selection to support text and URL editing.");
}

const imageDescriptor: PreviewElementDescriptor = {
  nodeId: "hero-image",
  tagName: "img",
  attributes: { src: "/assets/hero.webp", alt: "Product preview" },
};

const imageSelection = resolvePreviewSelection(graph, imageDescriptor);
if (!imageSelection) throw new Error("Expected image selection to resolve.");

const imageCapabilities = getDirectEditCapabilities(imageSelection, imageDescriptor);
if (!imageCapabilities.includes("image")) {
  throw new Error("Expected image selection to support image editing.");
}

const missing = resolvePreviewSelection(graph, {
  nodeId: "missing-node",
  tagName: "div",
  attributes: {},
});
if (missing !== null) throw new Error("Unknown preview nodes must not resolve.");

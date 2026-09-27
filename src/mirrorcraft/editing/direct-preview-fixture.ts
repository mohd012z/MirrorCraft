import {
  createDirectPreviewEdit,
  createLoadRequest,
  createProjectExportRequest,
  createProjectImportRequest,
  type DirectPreviewSelection,
} from "@/mirrorcraft/editing/direct-preview";

const selection: DirectPreviewSelection = {
  nodeId: "hero-cta",
  kind: "child",
  sourcePath: "src/app/page.tsx",
  sourceLine: 42,
};

createDirectPreviewEdit(selection, {
  type: "text",
  value: "Get Started",
});

createDirectPreviewEdit(selection, {
  type: "url",
  value: "/signup",
});

createDirectPreviewEdit(selection, {
  type: "image",
  value: "/assets/hero.webp",
  alt: "Product preview",
});

createDirectPreviewEdit(selection, {
  type: "icon",
  value: "ArrowRight",
});

createDirectPreviewEdit(selection, {
  type: "prompt",
  value: "Make this CTA clearer without changing its route or function binding.",
});

createProjectImportRequest({
  format: "zip",
  source: "upload",
});

createProjectExportRequest({
  format: "mirrorcraft",
  includeAssets: true,
  includeHistory: true,
});

createLoadRequest({
  source: "url",
  value: "https://example.com",
});

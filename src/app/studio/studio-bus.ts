/**
 * Minimal in-page event bus for the Studio shell.
 *
 * The studio page (header/quickbar/nav) and the PreviewCanvas (where the
 * real editing state lives) are separate components. Instead of lifting all
 * that state up — which would re-run the heavy workspace — the shell
 * dispatches typed DOM events and the canvas listens for them.
 */
export const STUDIO_EVENTS = {
  undo: "mirrorcraft:studio-undo",
  redo: "mirrorcraft:studio-redo",
  io: "mirrorcraft:studio-io", // detail: "import" | "export" | "load"
  selectSection: "mirrorcraft:studio-select-section", // detail: { id }
  expandDesign: "mirrorcraft:studio-expand-design",
} as const;

export function dispatchStudioEvent(
  name: (typeof STUDIO_EVENTS)[keyof typeof STUDIO_EVENTS],
  detail?: unknown,
) {
  if (typeof document === "undefined") return;
  document.dispatchEvent(new CustomEvent(name, { detail }));
}

export function onStudioEvent(
  name: (typeof STUDIO_EVENTS)[keyof typeof STUDIO_EVENTS],
  handler: (detail: unknown) => void,
) {
  const listener = (event: Event) => handler((event as CustomEvent).detail);
  document.addEventListener(name, listener);
  return () => document.removeEventListener(name, listener);
}

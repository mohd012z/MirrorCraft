import type { ViewportProfile } from "@/mirrorcraft/shared/types";

export const DEFAULT_VIEWPORTS: ViewportProfile[] = [
  { id: "small-phone", label: "Small Phone", width: 360, height: 800 },
  { id: "phone", label: "Phone", width: 390, height: 844 },
  { id: "tablet", label: "Tablet", width: 768, height: 1024 },
  { id: "laptop", label: "Laptop", width: 1280, height: 800 },
  { id: "desktop", label: "Desktop", width: 1440, height: 900 },
];

export interface BreakpointProbeOptions {
  minWidth?: number;
  maxWidth?: number;
  radius?: number;
}

export function buildBreakpointProbeMatrix(
  breakpoints: number[],
  options: BreakpointProbeOptions = {},
): number[] {
  const minWidth = options.minWidth ?? 280;
  const maxWidth = options.maxWidth ?? 2560;
  const radius = options.radius ?? 1;
  const widths = new Set<number>(DEFAULT_VIEWPORTS.map((v) => v.width));

  for (const breakpoint of breakpoints) {
    for (let delta = -radius; delta <= radius; delta += 1) {
      const width = breakpoint + delta;
      if (width >= minWidth && width <= maxWidth) widths.add(width);
    }
  }

  return [...widths].sort((a, b) => a - b);
}

export interface ResponsiveTransition {
  property: string;
  fromWidth: number;
  toWidth: number;
  before: unknown;
  after: unknown;
}

export function detectResponsiveTransitions(
  samples: Array<{ width: number; state: Record<string, unknown> }>,
): ResponsiveTransition[] {
  const sorted = [...samples].sort((a, b) => a.width - b.width);
  const transitions: ResponsiveTransition[] = [];

  for (let i = 1; i < sorted.length; i += 1) {
    const previous = sorted[i - 1];
    const current = sorted[i];
    const keys = new Set([...Object.keys(previous.state), ...Object.keys(current.state)]);

    for (const key of keys) {
      if (!Object.is(previous.state[key], current.state[key])) {
        transitions.push({
          property: key,
          fromWidth: previous.width,
          toWidth: current.width,
          before: previous.state[key],
          after: current.state[key],
        });
      }
    }
  }

  return transitions;
}

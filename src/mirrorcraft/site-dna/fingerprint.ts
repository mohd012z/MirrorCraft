import type { FingerprintSet } from "@/mirrorcraft/shared/types";

export interface ComponentSignal {
  dom?: string;
  style?: string;
  visual?: string;
  geometry?: string;
  behavior?: string;
  content?: string;
}

function normalize(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function hash32(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fingerprintComponent(signal: ComponentSignal): FingerprintSet {
  return {
    domHash: signal.dom ? hash32(normalize(signal.dom)) : undefined,
    styleHash: signal.style ? hash32(normalize(signal.style)) : undefined,
    visualHash: signal.visual ? hash32(normalize(signal.visual)) : undefined,
    geometryHash: signal.geometry ? hash32(normalize(signal.geometry)) : undefined,
    behaviorHash: signal.behavior ? hash32(normalize(signal.behavior)) : undefined,
    contentHash: signal.content ? hash32(normalize(signal.content)) : undefined,
  };
}

export function fingerprintSimilarity(a: FingerprintSet, b: FingerprintSet): number {
  const keys = ["domHash", "styleHash", "visualHash", "geometryHash", "behaviorHash", "contentHash"] as const;
  let compared = 0;
  let equal = 0;
  for (const key of keys) {
    if (a[key] && b[key]) {
      compared += 1;
      if (a[key] === b[key]) equal += 1;
    }
  }
  return compared === 0 ? 0 : equal / compared;
}

export function clusterReusableComponents<T extends { id: string; fingerprints: FingerprintSet }>(
  components: T[],
  threshold = 0.66,
): T[][] {
  const groups: T[][] = [];
  const used = new Set<string>();

  for (const component of components) {
    if (used.has(component.id)) continue;
    const group = [component];
    used.add(component.id);

    for (const candidate of components) {
      if (used.has(candidate.id)) continue;
      if (fingerprintSimilarity(component.fingerprints, candidate.fingerprints) >= threshold) {
        group.push(candidate);
        used.add(candidate.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

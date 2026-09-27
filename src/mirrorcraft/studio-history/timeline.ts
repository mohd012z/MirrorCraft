import type {
  StudioHistory,
  StudioHistoryTransition,
  StudioSnapshot,
} from "@/mirrorcraft/studio-history";

export const STUDIO_BASELINE_ID = "studio-baseline";

export interface StudioTimelineEntry {
  id: string;
  label: string;
  timestamp?: string;
  active: boolean;
  position: "past" | "present" | "future";
  operationsCount: number;
  snapshot: StudioSnapshot;
}

function cloneSnapshot(snapshot: StudioSnapshot): StudioSnapshot {
  return {
    composition: {
      ...snapshot.composition,
      sections: snapshot.composition.sections.map((section) => ({ ...section })),
    },
    content: {
      ...snapshot.content,
      values: { ...snapshot.content.values },
    },
  };
}

function chronologicalTransitions(history: StudioHistory): readonly StudioHistoryTransition[] {
  if (history.entries.length > 0) return history.entries;
  return [...history.past, ...history.future];
}

function baselineSnapshot(
  history: StudioHistory,
  transitions: readonly StudioHistoryTransition[],
): StudioSnapshot {
  return cloneSnapshot(transitions[0]?.before ?? history.present);
}

export function getStudioTimeline(history: StudioHistory): readonly StudioTimelineEntry[] {
  const transitions = chronologicalTransitions(history);
  const activeTransitionId = history.past.at(-1)?.id;
  const baselineActive = history.past.length === 0;
  const entries: StudioTimelineEntry[] = [
    {
      id: STUDIO_BASELINE_ID,
      label: "Baseline",
      active: baselineActive,
      position: baselineActive ? "present" : "past",
      operationsCount: 0,
      snapshot: baselineSnapshot(history, transitions),
    },
  ];

  transitions.forEach((transition, index) => {
    const active = transition.id === activeTransitionId;
    const inPast = index < history.past.length;
    entries.push({
      id: transition.id,
      label: transition.label,
      timestamp: transition.timestamp,
      active,
      position: active ? "present" : inPast ? "past" : "future",
      operationsCount: transition.operations.length,
      snapshot: cloneSnapshot(transition.after),
    });
  });

  return entries;
}

export function jumpToStudioSnapshot(
  history: StudioHistory,
  targetId: string,
): StudioHistory {
  const transitions = chronologicalTransitions(history);

  if (targetId === STUDIO_BASELINE_ID) {
    return {
      ...history,
      present: baselineSnapshot(history, transitions),
      past: [],
      future: [...transitions],
      entries: [...transitions],
    };
  }

  const targetIndex = transitions.findIndex((transition) => transition.id === targetId);
  if (targetIndex < 0) {
    throw new Error(`Unknown studio history target: ${targetId}`);
  }

  const target = transitions[targetIndex];
  return {
    ...history,
    present: cloneSnapshot(target.after),
    past: transitions.slice(0, targetIndex + 1),
    future: transitions.slice(targetIndex + 1),
    entries: [...transitions],
  };
}

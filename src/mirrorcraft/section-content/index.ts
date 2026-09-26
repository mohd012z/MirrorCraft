import { SECTION_PRESETS, type SectionPreset } from "@/mirrorcraft/design-library/advanced";
import {
  toSectionWebGraph,
  type PageComposition,
  type SectionInstance,
} from "@/mirrorcraft/section-composer";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export interface SectionContentState {
  revision: number;
  values: Record<string, string>;
}

function requirePreset(presetId: string): SectionPreset {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset;
}

export function getSectionSlotNodeId(instanceId: string, slot: string): string {
  return `${instanceId}:slot:${slot}`;
}

function defaultSlotValue(section: SectionInstance, preset: SectionPreset, slot: string): string {
  switch (slot) {
    case "brand":
      return "MirrorCraft";
    case "eyebrow":
      return preset.label;
    case "heading":
      return preset.label;
    case "copy":
      return preset.description;
    case "primaryAction":
    case "actions":
      return "Get started";
    case "media":
    case "dashboardPreview":
      return "https://placehold.co/960x640/png?text=MirrorCraft";
    case "quote":
      return "Structured sections stay editable without losing their graph relationships.";
    case "name":
      return "MirrorCraft User";
    case "role":
      return "Builder";
    case "avatar":
      return "https://placehold.co/160x160/png?text=MC";
    case "links":
      return "Product · Docs · Pricing";
    case "linkGroups":
      return "Product · Resources · Company";
    case "social":
      return "Social";
    case "legal":
      return "Privacy · Terms";
    case "items":
      return `${section.kind} item 1 · ${section.kind} item 2 · ${section.kind} item 3`;
    case "plans":
      return "Starter · Pro · Enterprise";
    case "billingToggle":
      return "Monthly · Yearly";
    default:
      return slot;
  }
}

function buildValues(
  composition: PageComposition,
  previous: Readonly<Record<string, string>> = {},
): Record<string, string> {
  const values: Record<string, string> = {};

  for (const section of composition.sections) {
    const preset = requirePreset(section.presetId);
    for (const slot of preset.slots) {
      const nodeId = getSectionSlotNodeId(section.instanceId, slot);
      values[nodeId] = previous[nodeId] ?? defaultSlotValue(section, preset, slot);
    }
  }

  return values;
}

export function createSectionContentState(composition: PageComposition): SectionContentState {
  return {
    revision: 0,
    values: buildValues(composition),
  };
}

export function reconcileSectionContentState(
  state: SectionContentState,
  composition: PageComposition,
): SectionContentState {
  const values = buildValues(composition, state.values);
  const previousKeys = Object.keys(state.values);
  const nextKeys = Object.keys(values);
  const changed =
    previousKeys.length !== nextKeys.length ||
    nextKeys.some((key) => state.values[key] !== values[key]);

  return changed
    ? { revision: state.revision + 1, values }
    : state;
}

export function setSectionSlotValue(
  state: SectionContentState,
  instanceId: string,
  slot: string,
  value: string,
): SectionContentState {
  const nodeId = getSectionSlotNodeId(instanceId, slot);
  if (!(nodeId in state.values)) {
    throw new Error(`Unknown section slot: ${nodeId}`);
  }
  if (state.values[nodeId] === value) return state;

  return {
    revision: state.revision + 1,
    values: {
      ...state.values,
      [nodeId]: value,
    },
  };
}

export function getSectionSlotValue(
  state: SectionContentState,
  instanceId: string,
  slot: string,
): string | undefined {
  return state.values[getSectionSlotNodeId(instanceId, slot)];
}

export function toSectionContentWebGraph(
  composition: PageComposition,
  state: SectionContentState,
): WebStructureGraph {
  const base = toSectionWebGraph(composition);
  const nodes: WebStructureGraph["nodes"] = { ...base.nodes };
  const edges: WebStructureGraph["edges"] = [...base.edges];

  for (const section of composition.sections) {
    const preset = requirePreset(section.presetId);
    for (const slot of preset.slots) {
      const nodeId = getSectionSlotNodeId(section.instanceId, slot);
      nodes[nodeId] = {
        id: nodeId,
        kind: "content",
        label: `${preset.label} · ${slot}`,
        metadata: {
          sectionInstanceId: section.instanceId,
          presetId: preset.id,
          slot,
          value: state.values[nodeId] ?? "",
        },
      };
      edges.push({ from: section.instanceId, to: nodeId, kind: "contains" });
      edges.push({ from: section.instanceId, to: nodeId, kind: "binds-content" });
    }
  }

  return {
    ...base,
    projectId: `section-content:${composition.pageId}`,
    nodes,
    edges,
  };
}

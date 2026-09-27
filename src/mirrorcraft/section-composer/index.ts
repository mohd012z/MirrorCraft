import {
  SECTION_PRESETS,
  type SectionKind,
  type SectionPreset,
} from "@/mirrorcraft/design-library/advanced";
import type { WebStructureGraph } from "@/mirrorcraft/web-structure/types";

export interface SectionInstance {
  instanceId: string;
  presetId: string;
  kind: SectionKind;
  hidden: boolean;
}

export interface PageComposition {
  pageId: string;
  revision: number;
  sections: SectionInstance[];
}

function requirePreset(presetId: string): SectionPreset {
  const preset = SECTION_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error(`Unknown section preset: ${presetId}`);
  return preset;
}

function nextInstanceId(composition: PageComposition, presetId: string): string {
  const prefix = `section:${composition.pageId}:${presetId}:`;
  let sequence = 1;
  while (composition.sections.some((section) => section.instanceId === `${prefix}${sequence}`)) {
    sequence += 1;
  }
  return `${prefix}${sequence}`;
}

function withSections(composition: PageComposition, sections: SectionInstance[]): PageComposition {
  return {
    ...composition,
    revision: composition.revision + 1,
    sections,
  };
}

export function createPageComposition(pageId: string, presetIds: readonly string[]): PageComposition {
  const base: PageComposition = { pageId, revision: 0, sections: [] };
  return presetIds.reduce<PageComposition>((composition, presetId) => {
    const preset = requirePreset(presetId);
    return {
      ...composition,
      sections: [
        ...composition.sections,
        {
          instanceId: nextInstanceId(composition, presetId),
          presetId,
          kind: preset.kind,
          hidden: false,
        },
      ],
    };
  }, base);
}

export function addSection(
  composition: PageComposition,
  presetId: string,
  index = composition.sections.length,
): PageComposition {
  const preset = requirePreset(presetId);
  const boundedIndex = Math.max(0, Math.min(index, composition.sections.length));
  const section: SectionInstance = {
    instanceId: nextInstanceId(composition, presetId),
    presetId,
    kind: preset.kind,
    hidden: false,
  };
  const sections = [...composition.sections];
  sections.splice(boundedIndex, 0, section);
  return withSections(composition, sections);
}

export function moveSection(
  composition: PageComposition,
  instanceId: string,
  index: number,
): PageComposition {
  const currentIndex = composition.sections.findIndex((section) => section.instanceId === instanceId);
  if (currentIndex < 0) return composition;

  const sections = [...composition.sections];
  const [section] = sections.splice(currentIndex, 1);
  const boundedIndex = Math.max(0, Math.min(index, sections.length));
  sections.splice(boundedIndex, 0, section);
  return withSections(composition, sections);
}

export function duplicateSection(
  composition: PageComposition,
  instanceId: string,
): PageComposition {
  const index = composition.sections.findIndex((section) => section.instanceId === instanceId);
  if (index < 0) return composition;

  const original = composition.sections[index];
  const duplicate: SectionInstance = {
    ...original,
    instanceId: nextInstanceId(composition, original.presetId),
  };
  const sections = [...composition.sections];
  sections.splice(index + 1, 0, duplicate);
  return withSections(composition, sections);
}

export function hideSection(
  composition: PageComposition,
  instanceId: string,
  hidden: boolean,
): PageComposition {
  const index = composition.sections.findIndex((section) => section.instanceId === instanceId);
  if (index < 0 || composition.sections[index].hidden === hidden) return composition;

  const sections = composition.sections.map((section) =>
    section.instanceId === instanceId ? { ...section, hidden } : section,
  );
  return withSections(composition, sections);
}

export function deleteSection(
  composition: PageComposition,
  instanceId: string,
): PageComposition {
  if (!composition.sections.some((section) => section.instanceId === instanceId)) return composition;
  return withSections(
    composition,
    composition.sections.filter((section) => section.instanceId !== instanceId),
  );
}

export function replaceSectionVariant(
  composition: PageComposition,
  instanceId: string,
  presetId: string,
): PageComposition {
  const preset = requirePreset(presetId);
  const current = composition.sections.find((section) => section.instanceId === instanceId);
  if (!current) return composition;
  if (current.kind !== preset.kind) {
    throw new Error(`Cannot replace ${current.kind} section with ${preset.kind} preset`);
  }
  if (current.presetId === presetId) return composition;

  const sections = composition.sections.map((section) =>
    section.instanceId === instanceId
      ? { ...section, presetId, kind: preset.kind }
      : section,
  );
  return withSections(composition, sections);
}

export function toSectionWebGraph(composition: PageComposition): WebStructureGraph {
  const pageNodeId = `page:${composition.pageId}`;
  const nodes: WebStructureGraph["nodes"] = {
    [pageNodeId]: {
      id: pageNodeId,
      kind: "page",
      label: composition.pageId,
      metadata: { revision: composition.revision },
    },
  };

  const edges: WebStructureGraph["edges"] = [];
  composition.sections.forEach((section, order) => {
    const preset = requirePreset(section.presetId);
    nodes[section.instanceId] = {
      id: section.instanceId,
      kind: "container",
      label: preset.label,
      metadata: {
        sectionKind: section.kind,
        presetId: section.presetId,
        hidden: section.hidden,
        order,
        slots: [...preset.slots],
      },
    };
    edges.push({ from: pageNodeId, to: section.instanceId, kind: "contains" });
  });

  return {
    projectId: `section-composer:${composition.pageId}`,
    nodes,
    edges,
  };
}

import {
  addSection,
  createPageComposition,
  deleteSection,
  duplicateSection,
  hideSection,
  moveSection,
  replaceSectionVariant,
  toSectionWebGraph,
} from "@/mirrorcraft/section-composer";

let composition = createPageComposition("home", ["navbar-simple", "hero-centered", "features-grid", "footer-columns"]);
composition = addSection(composition, "pricing-three", 3);
composition = moveSection(composition, composition.sections[3].instanceId, 2);
composition = duplicateSection(composition, composition.sections[2].instanceId);
composition = hideSection(composition, composition.sections[1].instanceId, true);
composition = replaceSectionVariant(composition, composition.sections[1].instanceId, "split-media");
composition = deleteSection(composition, composition.sections[3].instanceId);

if (composition.sections.length < 4) throw new Error("Expected composed sections");
if (!composition.sections.some((section) => section.presetId === "split-media")) {
  throw new Error("Expected replaceSectionVariant to preserve the section instance");
}

const graph = toSectionWebGraph(composition);
if (!graph.nodes["page:home"]) throw new Error("Expected page node in WebStructure graph");

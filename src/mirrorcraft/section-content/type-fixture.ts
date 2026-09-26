import {
  createSectionContentState,
  getSectionSlotNodeId,
  reconcileSectionContentState,
  setSectionSlotValue,
  toSectionContentWebGraph,
} from "@/mirrorcraft/section-content";
import { createPageComposition, replaceSectionVariant } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("home", ["hero-centered", "cta-banner"]);
const content = createSectionContentState(composition);
const hero = composition.sections[0];
const updated = setSectionSlotValue(content, hero.instanceId, "heading", "A directly editable heading");
const changed = replaceSectionVariant(composition, hero.instanceId, "split-media");
const reconciled = reconcileSectionContentState(updated, changed);
const graph = toSectionContentWebGraph(changed, reconciled);
const headingNode = getSectionSlotNodeId(hero.instanceId, "heading");

const heading = reconciled.values[headingNode];
const nodeKind = graph.nodes[headingNode]?.kind;

void heading;
void nodeKind;

import {
  createStudioHistory,
  createStudioSnapshot,
  recordStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import {
  getStudioTimeline,
  jumpToStudioSnapshot,
} from "@/mirrorcraft/studio-history/timeline";
import {
  createSectionContentState,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("timeline", ["hero-centered"]);
const content = createSectionContentState(composition);
const heroId = composition.sections[0].instanceId;

let history = createStudioHistory(createStudioSnapshot(composition, content));

const firstContent = setSectionSlotValue(content, heroId, "heading", "First edit");
history = recordStudioSnapshot(
  history,
  createStudioSnapshot(composition, firstContent),
  { label: "First edit", timestamp: "2026-09-26T00:01:00.000Z" },
);
const firstId = history.past.at(-1)?.id;
if (!firstId) throw new Error("Expected first history transition id");

const secondContent = setSectionSlotValue(firstContent, heroId, "heading", "Second edit");
history = recordStudioSnapshot(
  history,
  createStudioSnapshot(composition, secondContent),
  { label: "Second edit", timestamp: "2026-09-26T00:02:00.000Z" },
);

const timeline = getStudioTimeline(history);
if (timeline.length !== 3 || !timeline.at(-1)?.active) {
  throw new Error("Expected initial state plus two edits with the newest active");
}

const jumped = jumpToStudioSnapshot(history, firstId);
if (jumped.past.at(-1)?.id !== firstId) {
  throw new Error("Expected jump to activate the requested transition snapshot");
}
if (jumped.past.length !== 1 || jumped.future.length !== 1) {
  throw new Error("Expected jump to repartition history around the target snapshot");
}

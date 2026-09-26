import {
  commitStudioSnapshot,
  createStudioHistory,
  getStudioTimeline,
  jumpToStudioSnapshot,
} from "@/mirrorcraft/edit-history";
import {
  createSectionContentState,
  setSectionSlotValue,
} from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("timeline", ["hero-centered"]);
const content = createSectionContentState(composition);
const heroId = composition.sections[0].instanceId;

let history = createStudioHistory(composition, content, {
  createdAt: "2026-09-26T00:00:00.000Z",
});

const firstContent = setSectionSlotValue(content, heroId, "heading", "First edit");
history = commitStudioSnapshot(history, {
  composition,
  content: firstContent,
  label: "First edit",
  createdAt: "2026-09-26T00:01:00.000Z",
});
const firstId = history.present.id;

const secondContent = setSectionSlotValue(firstContent, heroId, "heading", "Second edit");
history = commitStudioSnapshot(history, {
  composition,
  content: secondContent,
  label: "Second edit",
  createdAt: "2026-09-26T00:02:00.000Z",
});

const timeline = getStudioTimeline(history);
if (timeline.length !== 3 || !timeline.at(-1)?.active) {
  throw new Error("Expected three timeline entries with the newest active");
}

const jumped = jumpToStudioSnapshot(history, firstId);
if (jumped.present.id !== firstId) {
  throw new Error("Expected jump to activate the requested snapshot");
}
if (jumped.past.length !== 1 || jumped.future.length !== 1) {
  throw new Error("Expected jump to repartition history around the target snapshot");
}

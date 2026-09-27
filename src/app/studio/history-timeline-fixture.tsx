import { StudioHistoryTimeline } from "@/app/studio/studio-history-timeline";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("history-ui", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(createStudioSnapshot(composition, content));

export function HistoryTimelineFixture() {
  return (
    <StudioHistoryTimeline
      history={history}
      onJump={() => undefined}
    />
  );
}

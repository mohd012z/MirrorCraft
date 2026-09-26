import { StudioHistoryTimeline } from "@/app/studio/studio-history-timeline";
import { createStudioHistory } from "@/mirrorcraft/edit-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("history-ui", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(composition, content, {
  createdAt: "2026-09-26T00:00:00.000Z",
});

export function HistoryTimelineFixture() {
  return (
    <StudioHistoryTimeline
      history={history}
      onJump={() => undefined}
    />
  );
}

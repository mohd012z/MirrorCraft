import { StudioHistoryInspector } from "@/app/studio/studio-history-inspector";
import { StudioHistoryTimeline } from "@/app/studio/studio-history-timeline";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("history-deep-ui", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(createStudioSnapshot(composition, content));

export function HistoryDeepUiFixture() {
  return (
    <>
      <StudioHistoryTimeline
        history={history}
        onJump={() => undefined}
        onRestore={() => undefined}
      />
      <StudioHistoryInspector history={history} />
    </>
  );
}

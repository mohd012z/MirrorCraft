import { StudioHistoryToolbar } from "@/app/studio/studio-history-toolbar";
import { createStudioHistory } from "@/mirrorcraft/edit-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("home", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(composition, content);

export function StudioHistoryToolbarFixture() {
  return (
    <StudioHistoryToolbar
      history={history}
      onUndo={() => undefined}
      onRedo={() => undefined}
    />
  );
}

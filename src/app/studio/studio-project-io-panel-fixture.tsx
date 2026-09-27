import { StudioProjectIOPanel } from "@/app/studio/studio-project-io-panel";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";

const composition = createPageComposition("io-ui", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(createStudioSnapshot(composition, content));

export function StudioProjectIOPanelFixture() {
  return (
    <StudioProjectIOPanel
      projectId="mirrorcraft-fixture"
      history={history}
      onHistoryChange={() => undefined}
    />
  );
}

import { StudioHistoryExperience } from "@/app/studio/studio-history-experience";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("history-experience", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(createStudioSnapshot(composition, content));

export function HistoryExperienceFixture() {
  return (
    <StudioHistoryExperience
      history={history}
      onHistoryChange={() => undefined}
    />
  );
}

import { EditableComposedPagePreview } from "@/app/studio/editable-composed-preview";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("home", ["hero-centered"]);
const content = createSectionContentState(composition);

const fixture = (
  <EditableComposedPagePreview
    composition={composition}
    content={content}
    onContentChange={() => undefined}
  />
);

void fixture;

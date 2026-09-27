"use client";

import { StudioCompositionSurface } from "@/app/studio/studio-composition-surface";
import { useStudioModel } from "@/app/studio/use-studio-model";

export function StudioCompositionSurfaceFixture() {
  const model = useStudioModel();
  return <StudioCompositionSurface model={model} />;
}

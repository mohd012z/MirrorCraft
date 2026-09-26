import type { CanvasSelection } from "@/mirrorcraft/editing/canvas-bridge";
import { StudioOperationsSurface } from "@/app/studio/studio-operations-surface";

export interface StudioOperationsFixtureProps {
  selection: CanvasSelection | null;
}

export function StudioOperationsFixture({
  selection,
}: StudioOperationsFixtureProps) {
  return <StudioOperationsSurface selection={selection} />;
}

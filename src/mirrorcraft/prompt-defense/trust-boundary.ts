import type { TrustTier } from "./types";

const EXECUTABLE_INSTRUCTION_SOURCES: ReadonlySet<TrustTier> = new Set([
  "kernel",
  "project-policy",
  "operator",
]);

export function isExecutableInstructionSource(trust: TrustTier): boolean {
  return EXECUTABLE_INSTRUCTION_SOURCES.has(trust);
}

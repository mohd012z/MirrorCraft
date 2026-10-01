import type { InjectionDisposition, TrustTier } from "@/mirrorcraft/prompt-defense";

export type ContextSource = "user" | "browser" | "repository" | "network" | "generated";

export interface ContextChunk {
  id: string;
  source: ContextSource;
  trust: TrustTier;
  content: string;
  executable: boolean;
  injectionRisk: number;
  evidenceIds: string[];
  disposition?: InjectionDisposition;
}

export interface ContextEnvelope {
  instructions: ContextChunk[];
  evidence: ContextChunk[];
  quarantined: ContextChunk[];
  rawEvidence: ContextChunk[];
  modelContext: string;
}

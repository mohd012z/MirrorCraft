export type TrustTier =
  | "kernel"
  | "project-policy"
  | "operator"
  | "trusted-tool"
  | "repository"
  | "external-content";

export type InjectionSignal =
  | "identity-override"
  | "authority-override"
  | "instruction-priority-change"
  | "policy-redefinition"
  | "refusal-suppression"
  | "tool-permission-escalation"
  | "persistent-instruction"
  | "fake-authorization"
  | "reasoning-redirection"
  | "output-coercion"
  | "secret-acquisition-request"
  | "environment-manipulation";

export type InjectionClassification =
  | "none"
  | "suspicious"
  | "probable-injection"
  | "confirmed-injection";

export type InjectionDisposition =
  | "allow-as-data"
  | "quarantine"
  | "exclude-from-agent-context";

export interface InjectionEvidence {
  id: string;
  signal: InjectionSignal;
  source: string;
  excerpt: string;
  confidence: number;
}

export interface InjectionAssessment {
  score: number;
  classification: InjectionClassification;
  signals: InjectionSignal[];
  evidence: InjectionEvidence[];
  action: InjectionDisposition;
  sourceContent?: string;
}

export type SecurityEvidenceSourceType =
  | "dom"
  | "css"
  | "network"
  | "source"
  | "repository"
  | "agent";

export interface SecurityEvidence {
  id: string;
  sourceType: SecurityEvidenceSourceType;
  origin: string;
  selector?: string;
  path?: string;
  line?: number;
  hash: string;
  capturedAt: string;
  confidence: number;
}

export type SecurityEvidenceInput = SecurityEvidence;

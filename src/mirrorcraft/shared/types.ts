export type SourceKind =
  | "url"
  | "screenshot"
  | "image"
  | "html"
  | "zip"
  | "project"
  | "dom-snapshot"
  | "recording";

export type AccessClass =
  | "public"
  | "authorized-session"
  | "auth-required"
  | "subscription-required"
  | "consent-gate"
  | "bot-challenge"
  | "blocked"
  | "unknown";

export interface ProjectSource {
  id: string;
  kind: SourceKind;
  locator: string;
  displayName?: string;
  access: AccessClass;
  createdAt: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewportProfile {
  id: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
  label?: string;
}

export interface Evidence<T = unknown> {
  kind: string;
  source: string;
  confidence: number;
  value: T;
  capturedAt: string;
}

export interface FingerprintSet {
  domHash?: string;
  styleHash?: string;
  visualHash?: string;
  geometryHash?: string;
  behaviorHash?: string;
  contentHash?: string;
}

export interface Confidence {
  score: number;
  reasons: string[];
}

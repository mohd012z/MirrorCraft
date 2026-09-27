import type { Restriction, RestrictionDecision } from "@/mirrorcraft/policy/restrictions";
import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";

export const REVISION_POLICY_ENVELOPE_VERSION = 1 as const;

export interface RevisionPolicyEnvelope {
  readonly version: typeof REVISION_POLICY_ENVELOPE_VERSION;
  readonly snapshotId: string;
  readonly projectId: string;
  readonly revision: string;
  readonly commit: string;
  readonly createdAt: string;
  readonly digest: `sha256:${string}`;
  readonly decision: RestrictionDecision;
}

export interface CreateRevisionPolicyEnvelopeInput {
  snapshotId: string;
  manifest: Pick<ReleaseManifest, "projectId" | "revision" | "commit">;
  createdAt: string;
  decision: RestrictionDecision;
}

export interface RevisionPolicyEnvelopeValidation {
  valid: boolean;
  errors: readonly string[];
  evidence: readonly string[];
}

type EnvelopePayload = Omit<RevisionPolicyEnvelope, "digest">;

function cloneRestriction(restriction: Restriction): Restriction {
  return {
    code: restriction.code,
    scope: restriction.scope,
    severity: restriction.severity,
    message: restriction.message,
    evidence: [...restriction.evidence],
  };
}

function cloneDecision(decision: RestrictionDecision): RestrictionDecision {
  const restrictions = decision.restrictions.map(cloneRestriction);
  const blockers = restrictions.filter((restriction) => restriction.severity === "block");
  const warnings = restrictions.filter((restriction) => restriction.severity === "warning");
  return {
    allowed: blockers.length === 0,
    blockers,
    warnings,
    restrictions,
  };
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    const encoded = JSON.stringify(value);
    if (encoded === undefined) {
      throw new Error("Revision policy envelope contains a non-serializable value");
    }
    return encoded;
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, entryValue]) => entryValue !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
    .join(",")}}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable for revision policy validation");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(new Uint8Array(digest));
}

function payloadFromEnvelope(envelope: RevisionPolicyEnvelope): EnvelopePayload {
  return {
    version: envelope.version,
    snapshotId: envelope.snapshotId,
    projectId: envelope.projectId,
    revision: envelope.revision,
    commit: envelope.commit,
    createdAt: envelope.createdAt,
    decision: envelope.decision,
  };
}

async function digestPayload(payload: EnvelopePayload): Promise<`sha256:${string}`> {
  return `sha256:${await sha256(canonicalJson(payload))}`;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export async function createRevisionPolicyEnvelope(
  input: CreateRevisionPolicyEnvelopeInput,
): Promise<RevisionPolicyEnvelope> {
  const payload: EnvelopePayload = {
    version: REVISION_POLICY_ENVELOPE_VERSION,
    snapshotId: input.snapshotId.trim(),
    projectId: input.manifest.projectId,
    revision: input.manifest.revision,
    commit: input.manifest.commit,
    createdAt: input.createdAt,
    decision: cloneDecision(input.decision),
  };

  if (!payload.snapshotId) {
    throw new Error("Revision policy envelope snapshotId is required");
  }
  if (!Number.isFinite(Date.parse(payload.createdAt))) {
    throw new Error("Revision policy envelope createdAt must be a valid timestamp");
  }

  const envelope: RevisionPolicyEnvelope = {
    ...payload,
    digest: await digestPayload(payload),
  };
  return deepFreeze(envelope);
}

export async function validateRevisionPolicyEnvelope(
  envelope: RevisionPolicyEnvelope,
  manifest: Pick<ReleaseManifest, "projectId" | "revision" | "commit">,
): Promise<RevisionPolicyEnvelopeValidation> {
  const errors: string[] = [];
  const evidence = [
    `policy-snapshot:${envelope.snapshotId}`,
    `policy-revision:${envelope.revision}`,
    `release-revision:${manifest.revision}`,
  ];

  if (envelope.version !== REVISION_POLICY_ENVELOPE_VERSION) {
    errors.push(`Unsupported policy envelope version ${String(envelope.version)}.`);
  }
  if (envelope.projectId !== manifest.projectId) {
    errors.push("Policy envelope project does not match the release manifest.");
  }
  if (envelope.revision !== manifest.revision) {
    errors.push("Policy envelope revision does not match the release manifest.");
  }
  if (envelope.commit !== manifest.commit) {
    errors.push("Policy envelope commit does not match the release manifest.");
  }
  if (!Number.isFinite(Date.parse(envelope.createdAt))) {
    errors.push("Policy envelope createdAt is invalid.");
  }

  if (!/^sha256:[0-9a-f]{64}$/.test(envelope.digest)) {
    errors.push("Policy envelope integrity digest is malformed.");
  } else {
    try {
      const expectedDigest = await digestPayload(payloadFromEnvelope(envelope));
      if (expectedDigest !== envelope.digest) {
        errors.push("Policy envelope integrity digest does not match its contents.");
      }
    } catch {
      errors.push("Policy envelope integrity could not be verified.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    evidence,
  };
}

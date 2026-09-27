import type { Restriction, RestrictionDecision } from "@/mirrorcraft/policy/restrictions";
import type { ReleaseManifest } from "@/mirrorcraft/release-manifest";

export const REVISION_POLICY_ENVELOPE_VERSION = 1 as const;
export const DEFAULT_REVISION_POLICY_TTL_MS = 15 * 60 * 1000;
export const MAX_REVISION_POLICY_TTL_MS = 60 * 60 * 1000;
export const REVISION_POLICY_ATTESTATION_ALGORITHM = "ECDSA-P256-SHA256" as const;
export const REVISION_POLICY_ASSESSMENT_KINDS = [
  "access",
  "hosting",
  "security",
  "runtime",
  "integration",
  "domain",
  "publish",
] as const;

export type RevisionPolicyAssessmentKind =
  (typeof REVISION_POLICY_ASSESSMENT_KINDS)[number];
export type RevisionPolicyAssessmentStatus =
  | "pass"
  | "warning"
  | "block"
  | "not-applicable";

export interface RevisionPolicyAssessment {
  readonly status: RevisionPolicyAssessmentStatus;
  readonly evaluatedAt: string;
  readonly evidence: readonly string[];
}

export type RevisionPolicyAssessments = Readonly<
  Record<RevisionPolicyAssessmentKind, RevisionPolicyAssessment>
>;

export interface RevisionPolicyAttestation {
  readonly algorithm: typeof REVISION_POLICY_ATTESTATION_ALGORITHM;
  readonly keyId: string;
  readonly signature: string;
}

export interface RevisionPolicyEnvelopeSigner {
  readonly keyId: string;
  signDigest(digest: `sha256:${string}`): Promise<RevisionPolicyAttestation>;
}

export interface RevisionPolicyEnvelopeVerifier {
  verifyDigest(
    digest: `sha256:${string}`,
    attestation: RevisionPolicyAttestation,
  ): Promise<boolean>;
}

export interface RevisionPolicyEnvelope {
  readonly version: typeof REVISION_POLICY_ENVELOPE_VERSION;
  readonly snapshotId: string;
  readonly projectId: string;
  readonly revision: string;
  readonly commit: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly assessments: RevisionPolicyAssessments;
  readonly digest: `sha256:${string}`;
  readonly attestation?: RevisionPolicyAttestation;
  readonly decision: RestrictionDecision;
}

export interface CreateRevisionPolicyEnvelopeInput {
  snapshotId: string;
  manifest: Pick<ReleaseManifest, "projectId" | "revision" | "commit">;
  createdAt: string;
  ttlMs?: number;
  assessments: RevisionPolicyAssessments;
  decision: RestrictionDecision;
}

export interface RevisionPolicyEnvelopeValidation {
  valid: boolean;
  errors: readonly string[];
  evidence: readonly string[];
}

type EnvelopePayload = Omit<RevisionPolicyEnvelope, "digest" | "attestation">;

const ASSESSMENT_STATUSES = new Set<RevisionPolicyAssessmentStatus>([
  "pass",
  "warning",
  "block",
  "not-applicable",
]);
const ASSESSMENT_KINDS = new Set<string>(REVISION_POLICY_ASSESSMENT_KINDS);

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

function validateAssessment(
  kind: RevisionPolicyAssessmentKind,
  assessment: RevisionPolicyAssessment | undefined,
  createdAtMs: number,
): string[] {
  const errors: string[] = [];
  if (!assessment || typeof assessment !== "object") {
    return [`Policy assessment ${kind} is required.`];
  }
  if (!ASSESSMENT_STATUSES.has(assessment.status)) {
    errors.push(`Policy assessment ${kind} has an invalid status.`);
  }
  const evaluatedAtMs = Date.parse(assessment.evaluatedAt);
  if (!Number.isFinite(evaluatedAtMs)) {
    errors.push(`Policy assessment ${kind} has an invalid evaluatedAt timestamp.`);
  } else if (evaluatedAtMs > createdAtMs) {
    errors.push(`Policy assessment ${kind} cannot be evaluated after envelope creation.`);
  }
  if (!Array.isArray(assessment.evidence)) {
    errors.push(`Policy assessment ${kind} evidence must be an array.`);
  } else if (
    assessment.status !== "not-applicable" &&
    assessment.evidence.length === 0
  ) {
    errors.push(`Policy assessment ${kind} requires evidence.`);
  }
  return errors;
}

function cloneAssessments(
  assessments: RevisionPolicyAssessments,
  createdAtMs: number,
): RevisionPolicyAssessments {
  const source = assessments as Partial<RevisionPolicyAssessments> &
    Record<string, RevisionPolicyAssessment | undefined>;
  const unknownKinds = Object.keys(source).filter((kind) => !ASSESSMENT_KINDS.has(kind));
  if (unknownKinds.length > 0) {
    throw new Error(`Unknown revision policy assessment kinds: ${unknownKinds.join(", ")}`);
  }

  const errors = REVISION_POLICY_ASSESSMENT_KINDS.flatMap((kind) =>
    validateAssessment(kind, source[kind], createdAtMs),
  );
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }

  return Object.fromEntries(
    REVISION_POLICY_ASSESSMENT_KINDS.map((kind) => {
      const assessment = source[kind] as RevisionPolicyAssessment;
      return [
        kind,
        {
          status: assessment.status,
          evaluatedAt: new Date(Date.parse(assessment.evaluatedAt)).toISOString(),
          evidence: [...assessment.evidence],
        },
      ];
    }),
  ) as unknown as RevisionPolicyAssessments;
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

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function base64UrlToBuffer(value: string): ArrayBuffer {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new Error("Policy attestation signature is not valid base64url");
  }
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = globalThis.atob(padded);
  return copyToArrayBuffer(
    Uint8Array.from(binary, (character) => character.charCodeAt(0)),
  );
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
    expiresAt: envelope.expiresAt,
    assessments: envelope.assessments,
    decision: envelope.decision,
  };
}

async function digestPayload(payload: EnvelopePayload): Promise<`sha256:${string}`> {
  return `sha256:${await sha256(canonicalJson(payload))}`;
}

function policyAttestationMessage(
  digest: `sha256:${string}`,
  keyId: string,
): ArrayBuffer {
  return copyToArrayBuffer(
    new TextEncoder().encode(
      [
        "MIRRORCRAFT-REVISION-POLICY-ATTESTATION",
        `version=${REVISION_POLICY_ENVELOPE_VERSION}`,
        `algorithm=${REVISION_POLICY_ATTESTATION_ALGORITHM}`,
        `keyId=${keyId}`,
        `digest=${digest}`,
      ].join("\n"),
    ),
  );
}

function assertEcdsaP256Key(
  key: CryptoKey,
  expectedType: "private" | "public",
  requiredUsage: "sign" | "verify",
): void {
  const algorithm = key.algorithm as EcKeyAlgorithm;
  if (
    key.type !== expectedType ||
    algorithm.name !== "ECDSA" ||
    algorithm.namedCurve !== "P-256" ||
    !key.usages.includes(requiredUsage)
  ) {
    throw new Error(
      `Revision policy ${requiredUsage} key must be an ECDSA P-256 ${expectedType} CryptoKey`,
    );
  }
}

function normalizeKeyId(keyId: string): string {
  const normalized = keyId.trim();
  if (!normalized || normalized.length > 128) {
    throw new Error("Revision policy attestation keyId must be 1-128 characters");
  }
  return normalized;
}

function cloneAttestation(
  attestation: RevisionPolicyAttestation,
): RevisionPolicyAttestation {
  return {
    algorithm: attestation.algorithm,
    keyId: attestation.keyId,
    signature: attestation.signature,
  };
}

export function createEcdsaP256PolicySigner(
  keyId: string,
  privateKey: CryptoKey,
): RevisionPolicyEnvelopeSigner {
  const normalizedKeyId = normalizeKeyId(keyId);
  assertEcdsaP256Key(privateKey, "private", "sign");

  return {
    keyId: normalizedKeyId,
    async signDigest(digest) {
      const signature = await globalThis.crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        privateKey,
        policyAttestationMessage(digest, normalizedKeyId),
      );
      return {
        algorithm: REVISION_POLICY_ATTESTATION_ALGORITHM,
        keyId: normalizedKeyId,
        signature: bytesToBase64Url(new Uint8Array(signature)),
      };
    },
  };
}

export function createEcdsaP256PolicyVerifier(
  publicKeys: ReadonlyMap<string, CryptoKey>,
): RevisionPolicyEnvelopeVerifier {
  const trustedKeys = new Map<string, CryptoKey>();
  for (const [keyId, publicKey] of publicKeys) {
    const normalizedKeyId = normalizeKeyId(keyId);
    assertEcdsaP256Key(publicKey, "public", "verify");
    trustedKeys.set(normalizedKeyId, publicKey);
  }

  return {
    async verifyDigest(digest, attestation) {
      if (attestation.algorithm !== REVISION_POLICY_ATTESTATION_ALGORITHM) {
        return false;
      }
      const keyId = attestation.keyId.trim();
      const publicKey = trustedKeys.get(keyId);
      if (!publicKey) return false;

      let signature: ArrayBuffer;
      try {
        signature = base64UrlToBuffer(attestation.signature);
      } catch {
        return false;
      }

      return globalThis.crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        signature,
        policyAttestationMessage(digest, keyId),
      );
    },
  };
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

function validateTtl(ttlMs: number): number {
  if (
    !Number.isInteger(ttlMs) ||
    ttlMs <= 0 ||
    ttlMs > MAX_REVISION_POLICY_TTL_MS
  ) {
    throw new Error(
      `Revision policy envelope ttlMs must be an integer between 1 and ${MAX_REVISION_POLICY_TTL_MS}`,
    );
  }
  return ttlMs;
}

export async function createRevisionPolicyEnvelope(
  input: CreateRevisionPolicyEnvelopeInput,
  signer?: RevisionPolicyEnvelopeSigner,
): Promise<RevisionPolicyEnvelope> {
  const createdAtMs = Date.parse(input.createdAt);
  if (!Number.isFinite(createdAtMs)) {
    throw new Error("Revision policy envelope createdAt must be a valid timestamp");
  }
  const ttlMs = validateTtl(input.ttlMs ?? DEFAULT_REVISION_POLICY_TTL_MS);
  const assessments = cloneAssessments(input.assessments, createdAtMs);
  const decision = cloneDecision(input.decision);

  if (
    decision.allowed &&
    REVISION_POLICY_ASSESSMENT_KINDS.some(
      (kind) => assessments[kind].status === "block",
    )
  ) {
    throw new Error(
      "Revision policy envelope cannot be allowed while an assessment is blocked",
    );
  }

  const payload: EnvelopePayload = {
    version: REVISION_POLICY_ENVELOPE_VERSION,
    snapshotId: input.snapshotId.trim(),
    projectId: input.manifest.projectId,
    revision: input.manifest.revision,
    commit: input.manifest.commit,
    createdAt: new Date(createdAtMs).toISOString(),
    expiresAt: new Date(createdAtMs + ttlMs).toISOString(),
    assessments,
    decision,
  };

  if (!payload.snapshotId) {
    throw new Error("Revision policy envelope snapshotId is required");
  }

  const digest = await digestPayload(payload);
  let attestation: RevisionPolicyAttestation | undefined;
  if (signer) {
    const signed = await signer.signDigest(digest);
    if (
      signed.algorithm !== REVISION_POLICY_ATTESTATION_ALGORITHM ||
      signed.keyId !== signer.keyId ||
      !/^[A-Za-z0-9_-]+$/u.test(signed.signature)
    ) {
      throw new Error("Revision policy signer returned an invalid attestation");
    }
    attestation = cloneAttestation(signed);
  }

  const envelope: RevisionPolicyEnvelope = {
    ...payload,
    digest,
    ...(attestation ? { attestation } : {}),
  };
  return deepFreeze(envelope);
}

export async function validateRevisionPolicyEnvelope(
  envelope: RevisionPolicyEnvelope,
  manifest: Pick<ReleaseManifest, "projectId" | "revision" | "commit">,
  now: Date = new Date(),
  verifier?: RevisionPolicyEnvelopeVerifier,
): Promise<RevisionPolicyEnvelopeValidation> {
  const errors: string[] = [];
  const evidence = [
    `policy-snapshot:${envelope.snapshotId}`,
    `policy-revision:${envelope.revision}`,
    `release-revision:${manifest.revision}`,
    `policy-expires-at:${envelope.expiresAt}`,
    ...(envelope.attestation?.keyId
      ? [`policy-attestation-key:${envelope.attestation.keyId}`]
      : []),
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

  const createdAtMs = Date.parse(envelope.createdAt);
  const expiresAtMs = Date.parse(envelope.expiresAt);
  if (!Number.isFinite(createdAtMs)) {
    errors.push("Policy envelope createdAt is invalid.");
  }
  if (!Number.isFinite(expiresAtMs)) {
    errors.push("Policy envelope expiresAt is invalid.");
  }
  if (Number.isFinite(createdAtMs) && Number.isFinite(expiresAtMs)) {
    const ttlMs = expiresAtMs - createdAtMs;
    if (ttlMs <= 0 || ttlMs > MAX_REVISION_POLICY_TTL_MS) {
      errors.push("Policy envelope freshness window is invalid or exceeds the maximum allowed TTL.");
    }
    if (now.getTime() >= expiresAtMs) {
      errors.push("Policy envelope has expired and must be regenerated from current assessments.");
    }
  }

  const rawAssessments = envelope.assessments as
    | (Partial<RevisionPolicyAssessments> &
        Record<string, RevisionPolicyAssessment | undefined>)
    | undefined;
  if (!rawAssessments || typeof rawAssessments !== "object") {
    errors.push("Policy envelope assessments are missing.");
  } else {
    const unknownKinds = Object.keys(rawAssessments).filter(
      (kind) => !ASSESSMENT_KINDS.has(kind),
    );
    if (unknownKinds.length > 0) {
      errors.push(`Policy envelope contains unknown assessment kinds: ${unknownKinds.join(", ")}.`);
    }
    if (Number.isFinite(createdAtMs)) {
      errors.push(
        ...REVISION_POLICY_ASSESSMENT_KINDS.flatMap((kind) =>
          validateAssessment(kind, rawAssessments[kind], createdAtMs),
        ),
      );
    }
    if (
      envelope.decision.allowed &&
      REVISION_POLICY_ASSESSMENT_KINDS.some(
        (kind) => rawAssessments[kind]?.status === "block",
      )
    ) {
      errors.push("Policy envelope decision is allowed while an assessment is blocked.");
    }
  }

  const digestWellFormed = /^sha256:[0-9a-f]{64}$/u.test(envelope.digest);
  if (!digestWellFormed) {
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

  const attestation = envelope.attestation;
  if (!attestation) {
    errors.push("Policy envelope attestation is required for deployment execution.");
  } else if (
    attestation.algorithm !== REVISION_POLICY_ATTESTATION_ALGORITHM ||
    !attestation.keyId.trim() ||
    !/^[A-Za-z0-9_-]+$/u.test(attestation.signature)
  ) {
    errors.push("Policy envelope attestation is malformed.");
  } else if (!verifier) {
    errors.push("Policy envelope attestation verifier is unavailable.");
  } else if (digestWellFormed) {
    try {
      const verified = await verifier.verifyDigest(envelope.digest, attestation);
      if (!verified) {
        errors.push("Policy envelope attestation signature is invalid.");
      }
    } catch {
      errors.push("Policy envelope attestation signature could not be verified.");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    evidence,
  };
}

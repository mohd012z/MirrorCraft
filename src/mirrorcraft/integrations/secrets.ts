export const SECRET_REF_SCHEME = "secret" as const;
export const SECRET_REF_PREFIX = `${SECRET_REF_SCHEME}://` as const;

export interface SecretRef {
  scheme: typeof SECRET_REF_SCHEME;
  provider: string;
  connectionId: string;
  secretId: string;
}

export interface CreateSecretRefInput {
  provider: string;
  connectionId: string;
  secretId: string;
}

export interface SecretResolver {
  resolve(ref: SecretRef): Promise<string>;
}

const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const INVALID_SECRET_REF = "Invalid MirrorCraft secret reference";

function normalizeSegment(value: string, label: string): string {
  const normalized = value.trim();
  if (!SAFE_SEGMENT.test(normalized)) {
    throw new Error(`${INVALID_SECRET_REF}: ${label}`);
  }
  return normalized;
}

export function createSecretRef(input: CreateSecretRefInput): SecretRef {
  return {
    scheme: SECRET_REF_SCHEME,
    provider: normalizeSegment(input.provider, "provider"),
    connectionId: normalizeSegment(input.connectionId, "connectionId"),
    secretId: normalizeSegment(input.secretId, "secretId"),
  };
}

export function serializeSecretRef(ref: SecretRef): string {
  const normalized = createSecretRef(ref);
  return `${SECRET_REF_PREFIX}${normalized.provider}/${normalized.connectionId}/${normalized.secretId}`;
}

export function parseSecretRef(value: string): SecretRef {
  if (!value.startsWith(SECRET_REF_PREFIX)) {
    throw new Error(INVALID_SECRET_REF);
  }

  const remainder = value.slice(SECRET_REF_PREFIX.length);
  const segments = remainder.split("/");
  if (segments.length !== 3 || segments.some((segment) => segment.length === 0)) {
    throw new Error(INVALID_SECRET_REF);
  }

  try {
    return createSecretRef({
      provider: segments[0],
      connectionId: segments[1],
      secretId: segments[2],
    });
  } catch {
    throw new Error(INVALID_SECRET_REF);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSecretRef(value: unknown): value is SecretRef {
  if (!isRecord(value)) return false;
  if (
    value.scheme !== SECRET_REF_SCHEME ||
    typeof value.provider !== "string" ||
    typeof value.connectionId !== "string" ||
    typeof value.secretId !== "string"
  ) {
    return false;
  }

  try {
    createSecretRef({
      provider: value.provider,
      connectionId: value.connectionId,
      secretId: value.secretId,
    });
    return true;
  } catch {
    return false;
  }
}

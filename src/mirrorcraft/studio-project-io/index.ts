import { redactSensitiveText } from "@/mirrorcraft/security/redaction";
import {
  STUDIO_RECOVERY_SCHEMA_VERSION,
  parseStudioRecoveryRecord,
} from "@/mirrorcraft/studio-recovery";
import {
  createStudioHistory,
  createStudioSnapshot,
  type StudioHistory,
  type StudioSnapshot,
} from "@/mirrorcraft/studio-history";

export const STUDIO_PROJECT_FORMAT = "mirrorcraft-studio" as const;
export const STUDIO_PROJECT_SCHEMA_VERSION = 1 as const;

export interface StudioProjectBundle {
  format: typeof STUDIO_PROJECT_FORMAT;
  schemaVersion: typeof STUDIO_PROJECT_SCHEMA_VERSION;
  projectId: string;
  exportedAt: string;
  snapshot: StudioSnapshot;
}

export interface CreateStudioProjectBundleOptions {
  exportedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeProjectId(projectId: string): string {
  const normalized = projectId.trim();
  if (!normalized) throw new Error("Studio projectId must not be empty");
  return normalized;
}

function normalizeExportedAt(exportedAt: string | undefined): string {
  const value = exportedAt ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(value))) {
    throw new Error("Studio project exportedAt must be a valid timestamp");
  }
  return value;
}

function assertNoSensitiveMaterial(raw: string): void {
  const result = redactSensitiveText(raw);
  if (result.redacted) {
    throw new Error(
      `Studio project bundle contains sensitive material (${result.categories.join(", ")})`,
    );
  }
}

function validateSnapshot(
  projectId: string,
  exportedAt: string,
  snapshot: unknown,
): StudioSnapshot {
  const recoveryRecord = parseStudioRecoveryRecord(
    JSON.stringify({
      schemaVersion: STUDIO_RECOVERY_SCHEMA_VERSION,
      projectId,
      savedAt: exportedAt,
      snapshot,
      historyEntryCount: 0,
    }),
  );
  return createStudioSnapshot(
    recoveryRecord.snapshot.composition,
    recoveryRecord.snapshot.content,
  );
}

export function createStudioProjectBundle(
  projectId: string,
  history: StudioHistory,
  options: CreateStudioProjectBundleOptions = {},
): StudioProjectBundle {
  return {
    format: STUDIO_PROJECT_FORMAT,
    schemaVersion: STUDIO_PROJECT_SCHEMA_VERSION,
    projectId: normalizeProjectId(projectId),
    exportedAt: normalizeExportedAt(options.exportedAt),
    snapshot: createStudioSnapshot(
      history.present.composition,
      history.present.content,
    ),
  };
}

export function serializeStudioProjectBundle(bundle: StudioProjectBundle): string {
  const normalized: StudioProjectBundle = {
    format: STUDIO_PROJECT_FORMAT,
    schemaVersion: STUDIO_PROJECT_SCHEMA_VERSION,
    projectId: normalizeProjectId(bundle.projectId),
    exportedAt: normalizeExportedAt(bundle.exportedAt),
    snapshot: createStudioSnapshot(
      bundle.snapshot.composition,
      bundle.snapshot.content,
    ),
  };
  const raw = JSON.stringify(normalized, null, 2);
  assertNoSensitiveMaterial(raw);
  return raw;
}

export function parseStudioProjectBundle(raw: string): StudioProjectBundle {
  assertNoSensitiveMaterial(raw);

  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Studio project bundle is not valid JSON");
  }

  if (!isRecord(value)) throw new Error("Studio project bundle must be an object");
  if (value.format !== STUDIO_PROJECT_FORMAT) {
    throw new Error("Unsupported Studio project format");
  }
  if (value.schemaVersion !== STUDIO_PROJECT_SCHEMA_VERSION) {
    throw new Error("Unsupported Studio project schema version");
  }
  if (typeof value.projectId !== "string") {
    throw new Error("Studio project bundle has invalid projectId");
  }
  if (typeof value.exportedAt !== "string") {
    throw new Error("Studio project bundle has invalid exportedAt");
  }

  const projectId = normalizeProjectId(value.projectId);
  const exportedAt = normalizeExportedAt(value.exportedAt);
  const snapshot = validateSnapshot(projectId, exportedAt, value.snapshot);

  return {
    format: STUDIO_PROJECT_FORMAT,
    schemaVersion: STUDIO_PROJECT_SCHEMA_VERSION,
    projectId,
    exportedAt,
    snapshot,
  };
}

export function createStudioHistoryFromProjectBundle(
  bundle: StudioProjectBundle,
  limit = 100,
): StudioHistory {
  const projectId = normalizeProjectId(bundle.projectId);
  const exportedAt = normalizeExportedAt(bundle.exportedAt);
  const snapshot = validateSnapshot(projectId, exportedAt, bundle.snapshot);
  return createStudioHistory(snapshot, limit);
}

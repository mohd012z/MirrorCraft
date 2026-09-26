import {
  createStudioSnapshot,
  type StudioHistory,
  type StudioSnapshot,
} from "@/mirrorcraft/studio-history";

export const STUDIO_RECOVERY_SCHEMA_VERSION = 1 as const;

export interface StudioRecoveryRecord {
  schemaVersion: typeof STUDIO_RECOVERY_SCHEMA_VERSION;
  projectId: string;
  savedAt: string;
  snapshot: StudioSnapshot;
  historyEntryCount: number;
}

export interface CreateStudioRecoveryRecordOptions {
  savedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteTimestamp(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function assertSnapshot(value: unknown): asserts value is StudioSnapshot {
  if (!isRecord(value)) throw new Error("Recovery snapshot must be an object");

  const composition = value.composition;
  const content = value.content;
  if (!isRecord(composition) || typeof composition.pageId !== "string") {
    throw new Error("Recovery snapshot has invalid composition");
  }
  if (!Array.isArray(composition.sections) || typeof composition.revision !== "number") {
    throw new Error("Recovery snapshot has invalid sections");
  }
  if (!isRecord(content) || typeof content.revision !== "number" || !isRecord(content.values)) {
    throw new Error("Recovery snapshot has invalid content");
  }
}

export function getStudioRecoveryStorageKey(projectId: string): string {
  const normalized = projectId.trim();
  if (!normalized) throw new Error("Recovery projectId must not be empty");
  return `mirrorcraft:studio-recovery:v${STUDIO_RECOVERY_SCHEMA_VERSION}:${encodeURIComponent(normalized)}`;
}

export function createStudioRecoveryRecord(
  projectId: string,
  history: StudioHistory,
  options: CreateStudioRecoveryRecordOptions = {},
): StudioRecoveryRecord {
  const normalized = projectId.trim();
  if (!normalized) throw new Error("Recovery projectId must not be empty");

  const savedAt = options.savedAt ?? new Date().toISOString();
  if (!isFiniteTimestamp(savedAt)) throw new Error("Recovery savedAt must be a valid timestamp");

  return {
    schemaVersion: STUDIO_RECOVERY_SCHEMA_VERSION,
    projectId: normalized,
    savedAt,
    snapshot: createStudioSnapshot(
      history.present.composition,
      history.present.content,
    ),
    historyEntryCount: history.entries.length,
  };
}

export function serializeStudioRecoveryRecord(record: StudioRecoveryRecord): string {
  return JSON.stringify(record);
}

export function parseStudioRecoveryRecord(raw: string): StudioRecoveryRecord {
  let value: unknown;
  try {
    value = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("Recovery record is not valid JSON");
  }

  if (!isRecord(value)) throw new Error("Recovery record must be an object");
  if (value.schemaVersion !== STUDIO_RECOVERY_SCHEMA_VERSION) {
    throw new Error("Unsupported recovery schema version");
  }
  if (typeof value.projectId !== "string" || !value.projectId.trim()) {
    throw new Error("Recovery record has invalid projectId");
  }
  if (typeof value.savedAt !== "string" || !isFiniteTimestamp(value.savedAt)) {
    throw new Error("Recovery record has invalid savedAt");
  }
  if (
    typeof value.historyEntryCount !== "number" ||
    !Number.isInteger(value.historyEntryCount) ||
    value.historyEntryCount < 0
  ) {
    throw new Error("Recovery record has invalid historyEntryCount");
  }

  assertSnapshot(value.snapshot);

  return {
    schemaVersion: STUDIO_RECOVERY_SCHEMA_VERSION,
    projectId: value.projectId,
    savedAt: value.savedAt,
    snapshot: createStudioSnapshot(
      value.snapshot.composition,
      value.snapshot.content,
    ),
    historyEntryCount: value.historyEntryCount,
  };
}

export function isStudioRecoveryNewer(
  record: StudioRecoveryRecord,
  comparedSavedAt: string | null,
): boolean {
  if (!comparedSavedAt) return true;
  const compared = Date.parse(comparedSavedAt);
  if (!Number.isFinite(compared)) return true;
  return Date.parse(record.savedAt) > compared;
}

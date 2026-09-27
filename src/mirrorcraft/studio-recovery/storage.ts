import {
  getStudioRecoveryStorageKey,
  parseStudioRecoveryRecord,
  serializeStudioRecoveryRecord,
  type StudioRecoveryRecord,
} from "@/mirrorcraft/studio-recovery";

export interface StudioRecoveryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type StudioRecoveryLoadResult =
  | { status: "empty" }
  | { status: "ready"; record: StudioRecoveryRecord }
  | { status: "invalid"; error: string };

export function saveStudioRecovery(
  storage: StudioRecoveryStorage,
  record: StudioRecoveryRecord,
): void {
  storage.setItem(
    getStudioRecoveryStorageKey(record.projectId),
    serializeStudioRecoveryRecord(record),
  );
}

export function loadStudioRecovery(
  storage: StudioRecoveryStorage,
  projectId: string,
): StudioRecoveryLoadResult {
  const key = getStudioRecoveryStorageKey(projectId);
  const raw = storage.getItem(key);
  if (raw === null) return { status: "empty" };

  try {
    const record = parseStudioRecoveryRecord(raw);
    if (record.projectId !== projectId.trim()) {
      return {
        status: "invalid",
        error: "Recovery record belongs to a different project",
      };
    }
    return { status: "ready", record };
  } catch (error) {
    return {
      status: "invalid",
      error: error instanceof Error ? error.message : "Recovery record is invalid",
    };
  }
}

export function clearStudioRecovery(
  storage: StudioRecoveryStorage,
  projectId: string,
): void {
  storage.removeItem(getStudioRecoveryStorageKey(projectId));
}

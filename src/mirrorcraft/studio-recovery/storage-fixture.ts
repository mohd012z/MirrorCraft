import {
  createStudioRecoveryRecord,
} from "@/mirrorcraft/studio-recovery";
import {
  clearStudioRecovery,
  loadStudioRecovery,
  saveStudioRecovery,
  type StudioRecoveryStorage,
} from "@/mirrorcraft/studio-recovery/storage";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const memory = new Map<string, string>();
const storage: StudioRecoveryStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => {
    memory.set(key, value);
  },
  removeItem: (key) => {
    memory.delete(key);
  },
};

const composition = createPageComposition("storage", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(createStudioSnapshot(composition, content));
const record = createStudioRecoveryRecord("project-storage", history, {
  savedAt: "2026-09-26T15:10:00.000Z",
});

saveStudioRecovery(storage, record);
const loaded = loadStudioRecovery(storage, "project-storage");
if (loaded.status !== "ready") throw new Error("Expected saved recovery record");
if (loaded.record.projectId !== "project-storage") throw new Error("Project id mismatch");

clearStudioRecovery(storage, "project-storage");
if (loadStudioRecovery(storage, "project-storage").status !== "empty") {
  throw new Error("Expected cleared recovery storage");
}

storage.setItem("mirrorcraft:studio-recovery:v1:corrupt", "{not-json");
const invalid = loadStudioRecovery(storage, "corrupt");
if (invalid.status !== "invalid") throw new Error("Corrupt recovery must fail closed");

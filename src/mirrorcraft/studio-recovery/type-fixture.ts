import {
  STUDIO_RECOVERY_SCHEMA_VERSION,
  createStudioRecoveryRecord,
  getStudioRecoveryStorageKey,
  isStudioRecoveryNewer,
  parseStudioRecoveryRecord,
  serializeStudioRecoveryRecord,
} from "@/mirrorcraft/studio-recovery";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";

const composition = createPageComposition("recovery", ["hero-centered"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(createStudioSnapshot(composition, content));

const record = createStudioRecoveryRecord("project-1", history, {
  savedAt: "2026-09-26T15:00:00.000Z",
});
const encoded = serializeStudioRecoveryRecord(record);
const decoded = parseStudioRecoveryRecord(encoded);

const schemaVersion: 1 = STUDIO_RECOVERY_SCHEMA_VERSION;
const key: string = getStudioRecoveryStorageKey("project-1");
const newer: boolean = isStudioRecoveryNewer(decoded, "2026-09-26T14:00:00.000Z");
const pageId: string = decoded.snapshot.composition.pageId;

void schemaVersion;
void key;
void newer;
void pageId;

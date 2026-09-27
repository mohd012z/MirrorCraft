import {
  createStudioProjectBundle,
  createStudioHistoryFromProjectBundle,
  parseStudioProjectBundle,
  serializeStudioProjectBundle,
} from "@/mirrorcraft/studio-project-io";
import { createSectionContentState } from "@/mirrorcraft/section-content";
import { createPageComposition } from "@/mirrorcraft/section-composer";
import {
  createStudioHistory,
  createStudioSnapshot,
} from "@/mirrorcraft/studio-history";

const composition = createPageComposition("io", ["hero-centered", "footer-columns"]);
const content = createSectionContentState(composition);
const history = createStudioHistory(createStudioSnapshot(composition, content));

const bundle = createStudioProjectBundle("mirrorcraft-io", history, {
  exportedAt: "2026-09-27T00:00:00.000Z",
});
const raw = serializeStudioProjectBundle(bundle);
const parsed = parseStudioProjectBundle(raw);
const restored = createStudioHistoryFromProjectBundle(parsed, 25);

if (parsed.projectId !== "mirrorcraft-io") throw new Error("Expected projectId round-trip");
if (parsed.snapshot.composition.pageId !== "io") throw new Error("Expected page composition round-trip");
if (restored.present.content.revision !== content.revision) throw new Error("Expected content revision round-trip");
if (restored.limit !== 25) throw new Error("Expected imported history limit");
if (raw.includes("secret://") || raw.includes("access_token") || raw.includes("client_secret")) {
  throw new Error("Project bundle must not serialize provider secret material");
}

let malformedRejected = false;
try {
  parseStudioProjectBundle('{"format":"wrong"}');
} catch {
  malformedRejected = true;
}
if (!malformedRejected) throw new Error("Malformed project bundle must fail closed");

const sensitiveComposition = createPageComposition("secret-test", ["hero-centered"]);
const sensitiveContent = createSectionContentState(sensitiveComposition);
const sensitiveNode = Object.keys(sensitiveContent.values)[0];
sensitiveContent.values[sensitiveNode] = "Authorization: Bearer mc_example_sensitive_token_1234567890";
const sensitiveHistory = createStudioHistory(
  createStudioSnapshot(sensitiveComposition, sensitiveContent),
);
const sensitiveBundle = createStudioProjectBundle("secret-test", sensitiveHistory);

let sensitiveRejected = false;
try {
  serializeStudioProjectBundle(sensitiveBundle);
} catch {
  sensitiveRejected = true;
}
if (!sensitiveRejected) throw new Error("Sensitive bundle material must be rejected before export");

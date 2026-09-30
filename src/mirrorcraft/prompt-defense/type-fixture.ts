import {
  createSecurityEvidence,
  isExecutableInstructionSource,
  type TrustTier,
} from "./index";

const trusted: readonly TrustTier[] = ["kernel", "project-policy", "operator"];
const untrusted: readonly TrustTier[] = ["repository", "external-content"];

for (const trust of trusted) {
  if (!isExecutableInstructionSource(trust)) {
    throw new Error(`expected ${trust} to be executable`);
  }
}

for (const trust of untrusted) {
  if (isExecutableInstructionSource(trust)) {
    throw new Error(`expected ${trust} to be non-executable`);
  }
}

const evidence = createSecurityEvidence({
  id: "evidence-1",
  sourceType: "dom",
  origin: "https://example.com",
  selector: "main > article",
  path: "/",
  line: 7,
  hash: "sha256:test",
  capturedAt: "2026-10-01T00:00:00.000Z",
  confidence: 0.93,
});

if (evidence.origin !== "https://example.com") throw new Error("origin not preserved");
if (evidence.hash !== "sha256:test") throw new Error("hash not preserved");
if (evidence.confidence !== 0.93) throw new Error("confidence not preserved");
if (evidence.selector !== "main > article") throw new Error("selector not preserved");
if (evidence.path !== "/") throw new Error("path not preserved");
if (evidence.line !== 7) throw new Error("line not preserved");

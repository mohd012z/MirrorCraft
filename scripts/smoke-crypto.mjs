import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import ts from "typescript";

const sourceUrl = new URL("../src/mirrorcraft/security/crypto.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
  reportDiagnostics: true,
});

const errors = (transpiled.diagnostics ?? []).filter(
  (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
);
if (errors.length > 0) {
  throw new Error(
    `Crypto smoke transpile failed: ${errors
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "))
      .join("; ")}`,
  );
}

const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const cryptoModule = await import(moduleUrl);
const {
  MIRRORCRAFT_ENCRYPTED_ENVELOPE_VERSION,
  encryptBundle,
  decryptBundle,
} = cryptoModule;

const passphrase = "MirrorCraft smoke passphrase 2026";
const context = "mirrorcraft:smoke:project";
const payload = {
  projectId: "crypto-smoke",
  settings: { theme: "dark", autosave: true },
  references: ["secret-ref://github/connection"],
};

const envelope = await encryptBundle(payload, passphrase, { context });
assert.equal(envelope.version, MIRRORCRAFT_ENCRYPTED_ENVELOPE_VERSION);
assert.equal(envelope.cipher.name, "AES-GCM");
assert.equal(envelope.kdf.name, "PBKDF2");
assert.equal(envelope.kdf.hash, "SHA-256");
assert.ok(envelope.kdf.iterations >= 600_000);
assert.ok(!JSON.stringify(envelope).includes(passphrase));
assert.ok(!JSON.stringify(envelope).includes(payload.projectId));

const decrypted = await decryptBundle(envelope, passphrase, { context });
assert.deepEqual(decrypted, payload);

await assert.rejects(
  () => decryptBundle(envelope, "Wrong MirrorCraft passphrase", { context }),
  /Unable to decrypt protected MirrorCraft bundle/,
);

const tampered = {
  ...envelope,
  ciphertext: `${envelope.ciphertext[0] === "A" ? "B" : "A"}${envelope.ciphertext.slice(1)}`,
};
await assert.rejects(
  () => decryptBundle(tampered, passphrase, { context }),
  /Unable to decrypt protected MirrorCraft bundle/,
);

await assert.rejects(
  () => decryptBundle(envelope, passphrase, { context: "mirrorcraft:smoke:other" }),
  /Unable to decrypt protected MirrorCraft bundle/,
);

console.log("MirrorCraft crypto smoke passed");

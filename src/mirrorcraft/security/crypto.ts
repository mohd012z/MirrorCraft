export const MIRRORCRAFT_ENCRYPTED_ENVELOPE_VERSION = 1 as const;
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
export const MIN_PBKDF2_ITERATIONS = 600_000;
export const MAX_PBKDF2_ITERATIONS = 2_000_000;

const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;
const AES_KEY_LENGTH_BITS = 256;
const AES_GCM_TAG_LENGTH_BITS = 128 as const;
const MIN_PASSPHRASE_CHARACTERS = 12;
const DEFAULT_CONTEXT = "default";
const DECRYPTION_ERROR = "Unable to decrypt protected MirrorCraft bundle";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface EncryptedEnvelopeKdf {
  name: "PBKDF2";
  hash: "SHA-256";
  iterations: number;
  salt: string;
}

export interface EncryptedEnvelopeCipher {
  name: "AES-GCM";
  iv: string;
  tagLength: 128;
}

export interface EncryptedEnvelope {
  version: typeof MIRRORCRAFT_ENCRYPTED_ENVELOPE_VERSION;
  kdf: EncryptedEnvelopeKdf;
  cipher: EncryptedEnvelopeCipher;
  aad: string;
  ciphertext: string;
}

export interface EncryptBundleOptions {
  context?: string;
  iterations?: number;
}

export interface DecryptBundleOptions {
  context?: string;
}

function webCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto API is unavailable in this runtime");
  }
  return globalThis.crypto;
}

function validatePassphrase(passphrase: string): void {
  if (passphrase.length < MIN_PASSPHRASE_CHARACTERS) {
    throw new Error(
      `MirrorCraft protected bundle passphrase must contain at least ${MIN_PASSPHRASE_CHARACTERS} characters`,
    );
  }
}

function validateIterations(iterations: number): number {
  if (
    !Number.isInteger(iterations) ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > MAX_PBKDF2_ITERATIONS
  ) {
    throw new Error(
      `PBKDF2 iterations must be between ${MIN_PBKDF2_ITERATIONS} and ${MAX_PBKDF2_ITERATIONS}`,
    );
  }
  return iterations;
}

function normalizeContext(context: string | undefined): string {
  const normalized = context?.trim();
  return normalized ? normalized : DEFAULT_CONTEXT;
}

function buildAdditionalAuthenticatedData(context: string | undefined): string {
  return `mirrorcraft:encrypted-bundle:v${MIRRORCRAFT_ENCRYPTED_ENVELOPE_VERSION}:${normalizeContext(context)}`;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function deriveEncryptionKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const crypto = webCrypto();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(textBytes(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: AES_KEY_LENGTH_BITS,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

function validateEnvelope(envelope: EncryptedEnvelope): {
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
} {
  if (
    envelope.version !== MIRRORCRAFT_ENCRYPTED_ENVELOPE_VERSION ||
    envelope.kdf.name !== "PBKDF2" ||
    envelope.kdf.hash !== "SHA-256" ||
    envelope.cipher.name !== "AES-GCM" ||
    envelope.cipher.tagLength !== AES_GCM_TAG_LENGTH_BITS
  ) {
    throw new Error(DECRYPTION_ERROR);
  }

  validateIterations(envelope.kdf.iterations);

  const salt = base64ToBytes(envelope.kdf.salt);
  const iv = base64ToBytes(envelope.cipher.iv);
  const ciphertext = base64ToBytes(envelope.ciphertext);

  if (
    salt.length !== SALT_LENGTH_BYTES ||
    iv.length !== IV_LENGTH_BYTES ||
    ciphertext.length <= AES_GCM_TAG_LENGTH_BITS / 8
  ) {
    throw new Error(DECRYPTION_ERROR);
  }

  return { salt, iv, ciphertext };
}

export async function encryptBundle<T extends JsonValue>(
  value: T,
  passphrase: string,
  options: EncryptBundleOptions = {},
): Promise<EncryptedEnvelope> {
  validatePassphrase(passphrase);
  const iterations = validateIterations(
    options.iterations ?? DEFAULT_PBKDF2_ITERATIONS,
  );
  const crypto = webCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const aad = buildAdditionalAuthenticatedData(options.context);
  const key = await deriveEncryptionKey(passphrase, salt, iterations);
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    throw new Error("MirrorCraft protected bundle must be JSON serializable");
  }

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: toArrayBuffer(textBytes(aad)),
      tagLength: AES_GCM_TAG_LENGTH_BITS,
    },
    key,
    toArrayBuffer(textBytes(serialized)),
  );

  return {
    version: MIRRORCRAFT_ENCRYPTED_ENVELOPE_VERSION,
    kdf: {
      name: "PBKDF2",
      hash: "SHA-256",
      iterations,
      salt: bytesToBase64(salt),
    },
    cipher: {
      name: "AES-GCM",
      iv: bytesToBase64(iv),
      tagLength: AES_GCM_TAG_LENGTH_BITS,
    },
    aad,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBundle<T extends JsonValue = JsonValue>(
  envelope: EncryptedEnvelope,
  passphrase: string,
  options: DecryptBundleOptions = {},
): Promise<T> {
  try {
    validatePassphrase(passphrase);
    const { salt, iv, ciphertext } = validateEnvelope(envelope);
    const expectedAad = buildAdditionalAuthenticatedData(options.context);
    if (envelope.aad !== expectedAad) {
      throw new Error(DECRYPTION_ERROR);
    }

    const key = await deriveEncryptionKey(
      passphrase,
      salt,
      envelope.kdf.iterations,
    );
    const plaintext = await webCrypto().subtle.decrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
        additionalData: toArrayBuffer(textBytes(envelope.aad)),
        tagLength: AES_GCM_TAG_LENGTH_BITS,
      },
      key,
      toArrayBuffer(ciphertext),
    );

    return JSON.parse(new TextDecoder().decode(plaintext)) as T;
  } catch {
    throw new Error(DECRYPTION_ERROR);
  }
}

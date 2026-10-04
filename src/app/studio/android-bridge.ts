"use client";

declare global {
  interface Window {
    AndroidBridge?: {
      saveBase64File: (filename: string, base64: string, mime: string) => void;
    };
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return window.btoa(binary);
}

/**
 * Save a generated file through the native Android WebView bridge when the
 * Studio is running inside the APK. Returns false in a normal browser so the
 * caller can use the standard Blob/download path.
 */
export function saveBytesWithAndroidBridge(
  filename: string,
  bytes: Uint8Array,
  mime: string,
): boolean {
  if (typeof window === "undefined" || !window.AndroidBridge?.saveBase64File) return false;
  window.AndroidBridge.saveBase64File(filename, bytesToBase64(bytes), mime);
  return true;
}

export function saveTextWithAndroidBridge(
  filename: string,
  text: string,
  mime: string,
): boolean {
  return saveBytesWithAndroidBridge(filename, new TextEncoder().encode(text), mime);
}

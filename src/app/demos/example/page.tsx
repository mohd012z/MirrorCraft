import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Example Domain",
  description:
    "Smoke-test clone of example.com — built from Playwright extraction artifacts.",
};

/**
 * Pixel-faithful clone of https://example.com
 * Spec: docs/research/example.com/components/main.md
 * Tokens: docs/research/example.com/tokens.json
 */
export default function ExampleComClone() {
  return (
    <main
      className="min-h-screen"
      style={{
        backgroundColor: "#eee",
        fontFamily: "system-ui, sans-serif",
        width: "60vw",
        margin: "15vh auto",
        color: "#000",
      }}
    >
      <div style={{ opacity: 0.8 }}>
        <h1 style={{ fontSize: "1.5em", fontWeight: 700, margin: "16.08px 0" }}>
          Example Domain
        </h1>
        <p style={{ fontSize: "16px", margin: "16px 0" }}>
          This domain is for use in documentation examples without needing
          permission. Avoid use in operations.
        </p>
        <p style={{ fontSize: "16px", margin: "16px 0" }}>
          <a
            href="https://iana.org/domains/example"
            style={{ color: "#348" }}
          >
            Learn more
          </a>
        </p>
      </div>
      <p
        style={{
          marginTop: "3rem",
          fontSize: "12px",
          opacity: 0.55,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        MirrorCraft smoke test ·{" "}
        <Link href="/" style={{ color: "#348" }}>
          ← back to landing
        </Link>
      </p>
    </main>
  );
}

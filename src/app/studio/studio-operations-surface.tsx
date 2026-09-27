"use client";

import { useMemo, useState } from "react";

import type { CanvasSelection } from "@/mirrorcraft/editing/canvas-bridge";
import { listEditParameters } from "@/mirrorcraft/editing/registry";
import type { EditCategory, EditParameterDefinition } from "@/mirrorcraft/editing/types";
import { classifyFreeHosting } from "@/mirrorcraft/hosting/classifier";
import { PROVIDER_CATALOG } from "@/mirrorcraft/hosting/provider-catalog";

export interface StudioOperationsSurfaceProps {
  selection: CanvasSelection | null;
}

type InspectorTab =
  | "Content"
  | "Style"
  | "Layout"
  | "Colors"
  | "Gradient"
  | "Responsive"
  | "Behavior"
  | "Access"
  | "Advanced";

type OperationsTab =
  | "Integrations"
  | "Hosting"
  | "Domain"
  | "Security"
  | "Publish";

const INSPECTOR_TABS: readonly InspectorTab[] = [
  "Content",
  "Style",
  "Layout",
  "Colors",
  "Gradient",
  "Responsive",
  "Behavior",
  "Access",
  "Advanced",
];

const OPERATIONS_TABS: readonly OperationsTab[] = [
  "Integrations",
  "Hosting",
  "Domain",
  "Security",
  "Publish",
];

const TAB_CATEGORIES: Readonly<Record<InspectorTab, readonly EditCategory[]>> = {
  Content: ["content", "template"],
  Style: ["style", "design", "button", "shape", "panel"],
  Layout: ["restructure", "design"],
  Colors: ["color"],
  Gradient: ["gradient"],
  Responsive: ["view"],
  Behavior: ["url", "animation", "form"],
  Access: ["access"],
  Advanced: ["rename", "asset", "metadata", "advanced"],
};

const DEMO_EVIDENCE_DATE = "2026-09-27";

function parameterForTab(
  tab: InspectorTab,
  selectedId: string | null,
): {
  parameters: EditParameterDefinition[];
  selected: EditParameterDefinition | null;
} {
  const allowed = new Set<EditCategory>(TAB_CATEGORIES[tab]);
  const parameters = listEditParameters().filter((parameter) =>
    allowed.has(parameter.category),
  );
  return {
    parameters,
    selected:
      parameters.find((parameter) => parameter.id === selectedId) ??
      parameters[0] ??
      null,
  };
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-white/10 bg-white/[0.035] px-2 py-1 text-[11px] text-white/55">
      {children}
    </span>
  );
}

export function StudioOperationsSurface({
  selection,
}: StudioOperationsSurfaceProps) {
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("Content");
  const [operationsTab, setOperationsTab] = useState<OperationsTab>("Integrations");
  const [selectedParameterId, setSelectedParameterId] = useState<string | null>(null);

  const inspector = useMemo(
    () => parameterForTab(inspectorTab, selectedParameterId),
    [inspectorTab, selectedParameterId],
  );

  const hostingPlan = useMemo(
    () =>
      classifyFreeHosting(
        {
          runtime: "static",
          commercialUse: false,
          requireCustomDomain: false,
          requiredCapabilities: ["hosting"],
          verifiedAt: DEMO_EVIDENCE_DATE,
          maxEvidenceAgeDays: 45,
        },
        PROVIDER_CATALOG,
      ),
    [],
  );

  const mutationPreview =
    selection && inspector.selected
      ? {
          category: inspector.selected.category,
          parameterId: inspector.selected.id,
          target: {
            nodeId: selection.nodeId,
            kind: selection.kind,
            sourcePath: selection.sourcePath ?? null,
          },
          viewport: "all",
          reversible: inspector.selected.reversible,
          verification: inspector.selected.verification.level,
        }
      : null;

  return (
    <section className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300/80">
            Structured Operations
          </div>
          <h2 className="mt-1 text-base font-semibold text-white">
            Inspector · Integrations · Hosting · Publish
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{selection ? `Selected: ${selection.nodeId}` : "Select an element"}</Badge>
          <Badge>SecretRef only</Badge>
          <Badge>No payment actions</Badge>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.7fr)]">
        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="flex flex-wrap gap-1 border-b border-white/10 pb-3">
            {INSPECTOR_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setInspectorTab(tab)}
                className={`rounded-md px-2.5 py-1.5 text-xs transition ${
                  inspectorTab === tab
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-1">
              {inspector.parameters.length > 0 ? (
                inspector.parameters.map((parameter) => (
                  <button
                    key={parameter.id}
                    type="button"
                    onClick={() => setSelectedParameterId(parameter.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${
                      inspector.selected?.id === parameter.id
                        ? "border-teal-300/30 bg-teal-300/10 text-white"
                        : "border-white/5 text-white/60 hover:bg-white/5"
                    }`}
                  >
                    <span>{parameter.label}</span>
                    <span className="text-white/30">{parameter.category}</span>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-white/10 p-3 text-xs text-white/35">
                  No parameters registered for this tab yet.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-[#090b10] p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white/75">Mutation preview</span>
                <span className="text-[11px] text-white/35">read-only until Apply</span>
              </div>
              {mutationPreview ? (
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="text-white/35">Target</dt><dd className="mt-0.5 text-white/75">{mutationPreview.target.nodeId}</dd></div>
                  <div><dt className="text-white/35">Parameter</dt><dd className="mt-0.5 text-white/75">{mutationPreview.parameterId}</dd></div>
                  <div><dt className="text-white/35">Category</dt><dd className="mt-0.5 text-white/75">{mutationPreview.category}</dd></div>
                  <div><dt className="text-white/35">Verification</dt><dd className="mt-0.5 text-white/75">{mutationPreview.verification}</dd></div>
                  <div><dt className="text-white/35">Viewport</dt><dd className="mt-0.5 text-white/75">{mutationPreview.viewport}</dd></div>
                  <div><dt className="text-white/35">Reversible</dt><dd className="mt-0.5 text-white/75">{mutationPreview.reversible ? "yes" : "no"}</dd></div>
                </dl>
              ) : (
                <p className="mt-3 text-xs leading-5 text-white/40">
                  Select an element in PreviewCanvas to bind inspector parameters to a traced source node.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/10 p-3">
          <div className="flex flex-wrap gap-1 border-b border-white/10 pb-3">
            {OPERATIONS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setOperationsTab(tab)}
                className={`rounded-md px-2.5 py-1.5 text-xs transition ${
                  operationsTab === tab
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:bg-white/5 hover:text-white/80"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-3 text-xs text-white/60">
            {operationsTab === "Integrations" && (
              <div className="space-y-2">
                <p className="text-white/75">Provider descriptors ready</p>
                <div className="flex flex-wrap gap-2">
                  {["GitHub", "Cloudflare", "Vercel", "Netlify", "Google/Firebase", "Supabase", "Neon"].map((provider) => (
                    <Badge key={provider}>{provider}</Badge>
                  ))}
                </div>
                <p className="leading-5 text-white/40">Credentials are not stored here. Connections resolve through authorized runtime connectors or opaque SecretRefs.</p>
              </div>
            )}

            {operationsTab === "Hosting" && (
              <div className="space-y-2">
                <p className="text-white/75">Demo static/personal eligibility snapshot</p>
                <div className="space-y-1">
                  {hostingPlan.eligible.map((candidate) => (
                    <div key={candidate.providerId} className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2">
                      <span>{candidate.label}</span>
                      <span className="text-emerald-300">evidence-ready</span>
                    </div>
                  ))}
                </div>
                <p className="leading-5 text-white/35">Snapshot date {DEMO_EVIDENCE_DATE}. Real projects must re-run the classifier against current runtime, commercial use, quota evidence, and policy eligibility.</p>
              </div>
            )}

            {operationsTab === "Domain" && (
              <div className="space-y-2">
                <p className="text-white/75">No custom domain configured</p>
                <p className="leading-5 text-white/40">Domain plans remain unverified until the provider confirms DNS ownership. MirrorCraft does not buy domains or silently edit registrar records.</p>
              </div>
            )}

            {operationsTab === "Security" && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2"><Badge>SecretRef boundary</Badge><Badge>AES-GCM bundle envelope</Badge><Badge>Redaction gate</Badge></div>
                <p className="leading-5 text-white/40">Tokens, cookies, OAuth codes, private keys, and connection strings are kept outside model-visible project state.</p>
              </div>
            )}

            {operationsTab === "Publish" && (
              <div className="space-y-2">
                <p className="text-amber-200">Publish remains gated</p>
                <p className="leading-5 text-white/40">A release needs compile verification, compatible runtime/hosting evidence, provider connection, and domain verification where applicable. This surface does not auto-publish.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

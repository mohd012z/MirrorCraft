import type {
  PolicyEnvelope,
  RestrictionResolution,
} from "@/mirrorcraft/policy/envelope";
import type {
  Restriction,
  RestrictionScope,
} from "@/mirrorcraft/policy/restrictions";

export interface RestrictionCenterProps {
  envelope: PolicyEnvelope;
}

const SCOPE_LABELS: Readonly<Record<RestrictionScope, string>> = {
  access: "Access",
  edit: "Editing",
  integration: "Integrations",
  hosting: "Hosting",
  deployment: "Deployment",
  publish: "Publish",
};

const SCOPE_ORDER: readonly RestrictionScope[] = [
  "access",
  "edit",
  "integration",
  "hosting",
  "deployment",
  "publish",
];

function RestrictionBadge({ restriction }: { restriction: Restriction }) {
  const block = restriction.severity === "block";
  return (
    <article
      className={`rounded-xl border p-3 ${
        block
          ? "border-rose-400/20 bg-rose-400/[0.06]"
          : "border-amber-300/20 bg-amber-300/[0.05]"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
              block
                ? "bg-rose-400/10 text-rose-200"
                : "bg-amber-300/10 text-amber-100"
            }`}
          >
            {block ? "BLOCK" : "WARNING"}
          </span>
          <span className="text-[11px] text-white/35">{restriction.code}</span>
        </div>
        <span className="text-[11px] text-white/35">
          {SCOPE_LABELS[restriction.scope]}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-white/75">
        {restriction.message}
      </p>

      {restriction.evidence.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {restriction.evidence.map((item) => (
            <span
              key={item}
              className="rounded border border-white/10 bg-black/20 px-2 py-1 text-[10px] text-white/40"
            >
              {item}
            </span>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ResolutionCard({ resolution }: { resolution: RestrictionResolution }) {
  return (
    <article className="rounded-xl border border-sky-300/15 bg-sky-300/[0.04] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-sky-100">
          {resolution.title}
        </span>
        <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/35">
          bypass: disabled
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-white/50">
        {resolution.guidance}
      </p>
    </article>
  );
}

export function RestrictionCenter({ envelope }: RestrictionCenterProps) {
  const activeScopes = SCOPE_ORDER.filter(
    (scope) => envelope.byScope[scope].length > 0,
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/70">
            Restriction Center
          </div>
          <h2 className="mt-1 text-base font-semibold text-white">
            Policy blockers, warnings and legitimate remediation
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span
            className={`rounded-md border px-2 py-1 ${
              envelope.allowed
                ? "border-emerald-300/20 bg-emerald-300/[0.06] text-emerald-200"
                : "border-rose-300/20 bg-rose-300/[0.06] text-rose-200"
            }`}
          >
            {envelope.allowed ? "ALLOWED" : "BLOCKED"}
          </span>
          <span className="rounded-md border border-white/10 px-2 py-1 text-white/45">
            {envelope.blockers.length} blockers
          </span>
          <span className="rounded-md border border-white/10 px-2 py-1 text-white/45">
            {envelope.warnings.length} warnings
          </span>
        </div>
      </div>

      {activeScopes.length === 0 ? (
        <div className="mt-4 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.04] p-3 text-xs leading-5 text-emerald-100/70">
          No active restrictions are present in this policy envelope.
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {activeScopes.map((scope) => (
            <div key={scope} className="space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/35">
                {SCOPE_LABELS[scope]}
              </div>
              {envelope.byScope[scope].map((restriction, index) => (
                <RestrictionBadge
                  key={`${restriction.code}:${restriction.message}:${index}`}
                  restriction={restriction}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {envelope.resolutions.length > 0 ? (
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-white/75">
                Resolution guidance
              </div>
              <p className="mt-1 text-[11px] leading-4 text-white/35">
                Guidance explains legitimate remediation only. Access controls,
                authentication, paywalls, CAPTCHA and provider policies are never
                bypassed.
              </p>
            </div>
            <span className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/35">
              read-only policy view
            </span>
          </div>
          <div className="grid gap-2 xl:grid-cols-2">
            {envelope.resolutions.map((resolution) => (
              <ResolutionCard
                key={`${resolution.kind}:${resolution.restrictionCode}:${resolution.scope}`}
                resolution={resolution}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

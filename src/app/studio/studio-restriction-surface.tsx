import { RestrictionCenter } from "@/app/studio/restriction-center";
import type { PolicyEnvelope } from "@/mirrorcraft/policy/envelope";

export interface StudioRestrictionSurfaceProps {
  envelope?: PolicyEnvelope | null;
}

export function StudioRestrictionSurface({
  envelope = null,
}: StudioRestrictionSurfaceProps) {
  if (envelope) {
    return <RestrictionCenter envelope={envelope} />;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-200/70">
            Restriction Center
          </div>
          <h2 className="mt-1 text-base font-semibold text-white">
            Project policy has not been evaluated yet
          </h2>
        </div>
        <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-white/45">
          NOT EVALUATED
        </span>
      </div>
      <p className="mt-3 max-w-3xl text-xs leading-5 text-white/45">
        MirrorCraft does not infer an ALLOWED state when access, editing authorization,
        provider health, hosting eligibility, domain verification and publish readiness
        have not been supplied. Runtime deployment guards remain fail-closed even when
        this view has no project envelope yet.
      </p>
    </section>
  );
}

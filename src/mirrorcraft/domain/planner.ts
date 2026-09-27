import type {
  CreateCustomDomainPlanInput,
  CreateProviderSubdomainPlanInput,
  DnsRecordPlan,
  DnsRecordPurpose,
  DnsRecordType,
  DomainPlan,
  DomainVerificationResult,
} from "@/mirrorcraft/domain/types";

const SAFE_PROVIDER_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/;
const DNS_RECORD_TYPES = new Set<DnsRecordType>(["A", "AAAA", "CNAME", "TXT"]);
const DNS_PURPOSES = new Set<DnsRecordPurpose>([
  "provider-routing",
  "ownership-verification",
  "www-alias",
  "custom",
]);
const HOST_LABEL = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;
const RECORD_NAME = /^(?:@|(?:_?[A-Za-z0-9][A-Za-z0-9_-]{0,62})(?:\.(?:_?[A-Za-z0-9][A-Za-z0-9_-]{0,62}))*)$/;

function normalizeProviderId(value: string): string {
  const normalized = value.trim();
  if (!SAFE_PROVIDER_ID.test(normalized)) {
    throw new Error("Domain providerId is invalid");
  }
  return normalized;
}

function normalizeHostname(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/\.$/, "");
  if (
    normalized.length === 0 ||
    normalized.length > 253 ||
    normalized.includes("://") ||
    normalized.includes("/") ||
    normalized.includes(":") ||
    normalized.includes(" ")
  ) {
    throw new Error("Domain hostname is invalid");
  }

  const labels = normalized.split(".");
  if (labels.length < 2 || labels.some((label) => !HOST_LABEL.test(label))) {
    throw new Error("Domain hostname is invalid");
  }

  return normalized;
}

function normalizeRecord(record: DnsRecordPlan): DnsRecordPlan {
  if (!DNS_RECORD_TYPES.has(record.type)) {
    throw new Error(`Unsupported DNS record type: ${record.type}`);
  }
  if (!DNS_PURPOSES.has(record.purpose)) {
    throw new Error(`Unsupported DNS record purpose: ${record.purpose}`);
  }

  const name = record.name.trim();
  const value = record.value.trim();
  if (!RECORD_NAME.test(name)) {
    throw new Error(`DNS record name is invalid: ${record.name}`);
  }
  if (value.length === 0 || value.length > 4096) {
    throw new Error("DNS record value is invalid");
  }
  if (value.toLowerCase().startsWith("secret://")) {
    throw new Error("MirrorCraft secret references are not valid DNS values");
  }
  if (
    record.ttl !== undefined &&
    (!Number.isInteger(record.ttl) || record.ttl < 0 || record.ttl > 2_147_483_647)
  ) {
    throw new Error("DNS record TTL is invalid");
  }

  return {
    type: record.type,
    name,
    value,
    ...(record.ttl !== undefined ? { ttl: record.ttl } : {}),
    purpose: record.purpose,
  };
}

function normalizeRecords(records: readonly DnsRecordPlan[]): DnsRecordPlan[] {
  const output: DnsRecordPlan[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    const normalized = normalizeRecord(record);
    const key = `${normalized.type}|${normalized.name.toLowerCase()}|${normalized.value}|${normalized.purpose}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(normalized);
  }

  return output;
}

function addWwwAlias(records: DnsRecordPlan[], apex: string): DnsRecordPlan[] {
  if (records.some((record) => record.name.toLowerCase() === "www")) {
    return records;
  }

  return [
    ...records,
    {
      type: "CNAME",
      name: "www",
      value: apex,
      purpose: "www-alias",
    },
  ];
}

function verificationBlocker(status: "pending" | "failed", message?: string): string {
  if (status === "failed") {
    return message?.trim()
      ? `Domain verification failed: ${message.trim()}`
      : "Domain verification failed.";
  }
  return "Domain verification is pending.";
}

export function createProviderSubdomainPlan(
  input: CreateProviderSubdomainPlanInput,
): DomainPlan {
  const providerId = normalizeProviderId(input.providerId);
  const hostname = normalizeHostname(input.hostname);

  return {
    providerId,
    mode: "provider-subdomain",
    hostname,
    apex: hostname,
    dnsRecords: [],
    ownershipVerified: false,
    verification: {
      status: "not-required",
      evidence: [],
    },
    blockers: [],
    warnings: [
      "Provider subdomains do not prove ownership of a user-controlled custom domain.",
    ],
  };
}

export function createCustomDomainPlan(
  input: CreateCustomDomainPlanInput,
): DomainPlan {
  const providerId = normalizeProviderId(input.providerId);
  const hostname = normalizeHostname(input.hostname);
  const providerRecords = normalizeRecords(input.providerRecords);
  const dnsRecords = input.includeWww
    ? addWwwAlias(providerRecords, hostname)
    : providerRecords;

  return {
    providerId,
    mode: "custom-domain",
    hostname,
    apex: hostname,
    ...(input.includeWww ? { wwwHostname: `www.${hostname}` } : {}),
    dnsRecords,
    ownershipVerified: false,
    verification: {
      status: "pending",
      evidence: [],
    },
    blockers: [verificationBlocker("pending")],
    warnings: [
      "This plan does not purchase a domain, modify registrar settings, or claim ownership before provider verification succeeds.",
      "Apply DNS records only through an authorized DNS provider or registrar account.",
    ],
  };
}

export function applyDomainVerification(
  plan: DomainPlan,
  result: DomainVerificationResult,
): DomainPlan {
  if (plan.mode !== "custom-domain") {
    throw new Error("Provider subdomains do not require custom-domain ownership verification");
  }

  const checkedAt = result.checkedAt.trim();
  if (!Number.isFinite(Date.parse(checkedAt))) {
    throw new Error("Domain verification checkedAt is invalid");
  }

  const evidence = [
    ...new Set(
      (result.evidence ?? [])
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  ];
  const preservedBlockers = plan.blockers.filter(
    (reason) => !reason.toLowerCase().includes("domain verification"),
  );

  if (result.status === "verified") {
    return {
      ...plan,
      ownershipVerified: true,
      verification: {
        status: "verified",
        checkedAt,
        evidence,
        ...(result.message?.trim() ? { message: result.message.trim() } : {}),
      },
      blockers: preservedBlockers,
    };
  }

  const message = result.message?.trim() || undefined;
  return {
    ...plan,
    ownershipVerified: false,
    verification: {
      status: result.status,
      checkedAt,
      evidence,
      ...(message ? { message } : {}),
    },
    blockers: [
      ...preservedBlockers,
      verificationBlocker(result.status, message),
    ],
  };
}

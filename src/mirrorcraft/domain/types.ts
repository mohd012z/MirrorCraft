export type DomainMode = "provider-subdomain" | "custom-domain";

export type DnsRecordType = "A" | "AAAA" | "CNAME" | "TXT";

export type DnsRecordPurpose =
  | "provider-routing"
  | "ownership-verification"
  | "www-alias"
  | "custom";

export interface DnsRecordPlan {
  type: DnsRecordType;
  name: string;
  value: string;
  ttl?: number;
  purpose: DnsRecordPurpose;
}

export type DomainVerificationStatus =
  | "not-required"
  | "pending"
  | "verified"
  | "failed";

export interface DomainVerificationState {
  status: DomainVerificationStatus;
  checkedAt?: string;
  evidence: readonly string[];
  message?: string;
}

export interface DomainPlan {
  providerId: string;
  mode: DomainMode;
  hostname: string;
  apex: string;
  wwwHostname?: string;
  dnsRecords: readonly DnsRecordPlan[];
  ownershipVerified: boolean;
  verification: DomainVerificationState;
  blockers: readonly string[];
  warnings: readonly string[];
}

export interface CreateProviderSubdomainPlanInput {
  providerId: string;
  hostname: string;
}

export interface CreateCustomDomainPlanInput {
  providerId: string;
  hostname: string;
  includeWww: boolean;
  providerRecords: readonly DnsRecordPlan[];
}

export interface DomainVerificationResult {
  status: "pending" | "verified" | "failed";
  checkedAt: string;
  evidence?: readonly string[];
  message?: string;
}

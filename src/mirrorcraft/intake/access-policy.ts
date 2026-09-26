import type { AccessClass } from "@/mirrorcraft/shared/types";

export interface AccessSignals {
  status?: number;
  title?: string;
  bodyText?: string;
  hasPasswordField?: boolean;
  hasSubscriptionCopy?: boolean;
  hasCaptcha?: boolean;
  hasConsentDialog?: boolean;
  authorizedSession?: boolean;
}

export interface AccessDecision {
  classification: AccessClass;
  captureAllowed: boolean;
  reason: string;
}

export function classifyAccess(signals: AccessSignals): AccessDecision {
  if (signals.hasCaptcha) {
    return { classification: "bot-challenge", captureAllowed: false, reason: "Bot challenge detected; MirrorCraft does not bypass anti-bot controls." };
  }

  if (signals.hasPasswordField && !signals.authorizedSession) {
    return { classification: "auth-required", captureAllowed: false, reason: "Authentication is required and no authorized session was supplied." };
  }

  if (signals.hasSubscriptionCopy && !signals.authorizedSession) {
    return { classification: "subscription-required", captureAllowed: false, reason: "Subscription-gated content is recorded as blocked rather than bypassed." };
  }

  if (signals.status === 401 || signals.status === 403) {
    return { classification: "blocked", captureAllowed: false, reason: `HTTP ${signals.status} blocks capture.` };
  }

  if (signals.authorizedSession) {
    return { classification: "authorized-session", captureAllowed: true, reason: "User-authorized browser session may be captured as rendered." };
  }

  if (signals.hasConsentDialog) {
    return { classification: "consent-gate", captureAllowed: true, reason: "Consent gate detected; capture may continue only after ordinary user-permitted consent handling." };
  }

  return { classification: "public", captureAllowed: true, reason: "Publicly rendered content may be analyzed." };
}

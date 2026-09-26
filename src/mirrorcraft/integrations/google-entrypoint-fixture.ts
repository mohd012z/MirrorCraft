import {
  GOOGLE_PROVIDER_DESCRIPTOR,
  GOOGLE_SERVICE_CATALOG,
  createGoogleIntegrationPlan,
} from "@/mirrorcraft/integrations/google";

if (GOOGLE_PROVIDER_DESCRIPTOR.id !== "google") {
  throw new Error("Google integration public entrypoint must expose the Google provider descriptor");
}
if (GOOGLE_SERVICE_CATALOG.length < 4) {
  throw new Error("Google integration public entrypoint must expose service capabilities");
}
if (typeof createGoogleIntegrationPlan !== "function") {
  throw new Error("Google integration public entrypoint must expose plan creation");
}

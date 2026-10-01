import { addWebEdge, addWebNode, createWebStructureGraph } from "@/mirrorcraft/web-structure/graph";
import { buildImpactReport, createMirrorCommand, resolveTarget } from "@/mirrorcraft/target-studio";

let graph = createWebStructureGraph("pricing-fixture");
graph = addWebNode(graph, {
  id: "route:/pricing",
  kind: "route",
  label: "Pricing",
  route: "/pricing",
  sourcePath: "src/app/pricing/page.tsx",
  metadata: { viewports: [390, 768, 1440] },
});
graph = addWebNode(graph, {
  id: "component:PricingCard",
  kind: "container",
  label: "PricingCard",
  route: "/pricing",
  sourcePath: "src/components/PricingCard.tsx",
  sourceLine: 18,
  metadata: {
    selector: "[data-mc-target='pricing-card']",
    styles: ["pricing-card"],
    viewports: [390, 768, 1440],
    findingIds: ["F-037"],
    evidenceIds: ["E-037"],
    tests: ["pricing-mobile.spec.ts"],
  },
});
graph = addWebNode(graph, {
  id: "function:pricing-cta",
  kind: "function",
  label: "Pricing CTA",
  route: "/pricing",
  sourcePath: "src/components/PricingCard.tsx",
});
graph = addWebEdge(graph, { from: "route:/pricing", to: "component:PricingCard", kind: "contains" });
graph = addWebEdge(graph, { from: "component:PricingCard", to: "function:pricing-cta", kind: "invokes" });

const resolution = resolveTarget(graph, { selector: "[data-mc-target='pricing-card']" });
if (resolution.selected?.target.id !== "component:PricingCard") {
  throw new Error("Target resolver failed to select PricingCard");
}

const impact = buildImpactReport(graph, "component:PricingCard");
if (!impact?.affectedRoutes.includes("/pricing") || !impact.affectedViewports.includes(390)) {
  throw new Error("Impact report missed pricing route or mobile viewport");
}
if (!impact.requiresBehaviorTest) {
  throw new Error("Impact report missed CTA behavior dependency");
}

const command = createMirrorCommand({
  command: "modify",
  targetId: "component:PricingCard",
  intent: "improve mobile spacing",
  verification: { viewports: [390, 768, 1440], visual: true, behavioral: true },
});
if (command.mode !== "virtual") {
  throw new Error("AI/user modification must default to virtual mode");
}

export const targetStudioFixture = { graph, resolution, impact, command };

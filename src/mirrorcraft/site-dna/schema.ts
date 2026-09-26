import type {
  BoundingBox,
  Confidence,
  Evidence,
  FingerprintSet,
  ViewportProfile,
} from "@/mirrorcraft/shared/types";

export interface SiteDNARoute {
  id: string;
  url: string;
  path: string;
  title?: string;
  access: string;
  depth: number;
  fingerprint?: string;
}

export interface SiteDNAComponent {
  id: string;
  name: string;
  role?: string;
  routeIds: string[];
  parentId?: string;
  children: string[];
  bbox?: BoundingBox;
  fingerprints: FingerprintSet;
  confidence: Confidence;
  sourceHints?: string[];
}

export interface ResponsiveState {
  viewport: ViewportProfile;
  routeId: string;
  componentId?: string;
  visible: boolean;
  bbox?: BoundingBox;
  display?: string;
  position?: string;
  columns?: number;
  overflowX?: string;
  overflowY?: string;
  evidence?: Evidence[];
}

export interface SiteDNA {
  version: "2.0";
  meta: {
    projectId: string;
    source: string;
    generatedAt: string;
    generator: "MirrorCraft";
  };
  routes: SiteDNARoute[];
  components: Record<string, SiteDNAComponent>;
  responsive: Record<string, ResponsiveState[]>;
  navigation: Record<string, unknown>;
  dom: Record<string, unknown>;
  tokens: Record<string, unknown>;
  typography: Record<string, unknown>;
  layouts: Record<string, unknown>;
  assets: Record<string, unknown>;
  interactions: Record<string, unknown>;
  animations: Record<string, unknown>;
  forms: Record<string, unknown>;
  accessibility: Record<string, unknown>;
  technologyHints: Record<string, unknown>;
  fingerprints: Record<string, FingerprintSet>;
}

export function createEmptySiteDNA(projectId: string, source: string): SiteDNA {
  return {
    version: "2.0",
    meta: {
      projectId,
      source,
      generatedAt: new Date().toISOString(),
      generator: "MirrorCraft",
    },
    routes: [],
    components: {},
    responsive: {},
    navigation: {},
    dom: {},
    tokens: {},
    typography: {},
    layouts: {},
    assets: {},
    interactions: {},
    animations: {},
    forms: {},
    accessibility: {},
    technologyHints: {},
    fingerprints: {},
  };
}
